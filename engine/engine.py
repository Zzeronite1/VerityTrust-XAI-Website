"""
VerityTrust Decision Engine v3 - Horizon-Labs/phishing-scam-detector-base (mmBERT, ONNX int8) cho OmniRoute.

- Mô hình phân loại fraud / spam / legitimate đa ngôn ngữ (có tiếng Việt), chạy bằng onnxruntime trên CPU:
  không cần torch, không cần AVX2, khoảng 1 GB RAM.
- Giữ nguyên định dạng trả về của v1/v2 (is_phishing / risk_vector / trust_score) để Verity không phải đổi.
- risk_vector.choice: clean | credential_theft | gambling | scam.
  Mô hình chỉ biết "có đáng ngờ không"; loại rủi ro được suy từ metadata Verity gửi (biểu mẫu nhạy cảm, từ khoá cờ bạc).

Cài đặt:  pip install onnxruntime tokenizers huggingface_hub numpy fastapi uvicorn
"""
import json
import re
import time
import uuid

import numpy as np
import onnxruntime as ort
import uvicorn
from fastapi import FastAPI
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

MODEL_ID = "Horizon-Labs/phishing-scam-detector-base"
ONNX_FILE = "onnx/model_quantized.onnx"  # int8, ~641 MB; đổi thành onnx/model.onnx nếu muốn bản fp32 (~1,2 GB)
MAX_LEN = 512                             # mmBERT đọc được 8192 token nhưng 512 đủ cho tiêu đề + đoạn đầu trang, và nhanh
THREADS = 4                               # Xeon E3-1230 V2: 4 nhân thật
UNWANTED_MIN = 0.5                        # P(fraud) + P(spam) từ ngưỡng này trở lên mới coi là rủi ro

print("Đang tải mô hình...")
tokenizer = Tokenizer.from_file(hf_hub_download(MODEL_ID, "tokenizer.json"))
tokenizer.enable_truncation(MAX_LEN)
id2label = {int(k): v for k, v in json.load(open(hf_hub_download(MODEL_ID, "config.json")))["id2label"].items()}
opts = ort.SessionOptions()
opts.intra_op_num_threads = THREADS
opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session = ort.InferenceSession(hf_hub_download(MODEL_ID, ONNX_FILE), opts, providers=["CPUExecutionProvider"])
INPUT_NAMES = {i.name for i in session.get_inputs()}
print(f"Mô hình sẵn sàng! Nhãn: {id2label}, đầu vào: {sorted(INPUT_NAMES)}")

app = FastAPI(title="VerityTrust Decision Engine v3 - OmniRoute Compatible")


def classify(text: str) -> dict:
    """Xác suất từng nhãn (legitimate / spam / fraud) cho một đoạn văn bản."""
    enc = tokenizer.encode(text)
    feeds = {
        "input_ids": np.array([enc.ids], dtype=np.int64),
        "attention_mask": np.array([enc.attention_mask], dtype=np.int64),
    }
    if "token_type_ids" in INPUT_NAMES:
        feeds["token_type_ids"] = np.zeros_like(feeds["input_ids"])
    logits = session.run(None, {k: v for k, v in feeds.items() if k in INPUT_NAMES})[0][0]
    p = np.exp(logits - logits.max())
    p /= p.sum()
    return {id2label[i]: float(v) for i, v in enumerate(p)}


# ------------------------------------------------------------------ Đọc metadata của Verity
def parse_metadata(prompt: str) -> dict:
    """'Tên miền: a | SSL: b | Nội dung: c' -> {'tên miền': 'a', ...}. Chuỗi không theo mẫu -> {}."""
    fields = {}
    for part in prompt.split(" | "):
        key, sep, value = part.partition(":")
        if sep and len(key) <= 30:
            fields[key.strip().lower()] = value.strip()
    return fields


def model_text(prompt: str, fields: dict) -> str:
    """Văn bản đưa vào mô hình: nội dung người dùng nhìn thấy (tiêu đề, nội dung, tên miền), bỏ thông số kỹ thuật."""
    if not fields.get("nội dung") and not fields.get("tiêu đề"):
        return prompt
    parts = [fields.get("tiêu đề", ""), fields.get("nội dung", ""), fields.get("tên miền", "")]
    return "\n".join(p for p in parts if p)


GAMBLING_RE = re.compile(
    r"cá cược|cá độ|nhà cái|nổ hũ|tài xỉu|lô đề|xóc đĩa|bắn cá|đá gà|casino|sportsbook|baccarat|poker|jackpot|roulette"
    r"|\bslots?\b|\bbet(?:ting)?\b|\bjudi\b|\btogel\b|\bbahis\b|\bkumar\b|แทงบอล|คาสิโน|บาคาร่า|สล็อต|کازینو|شرط‌بندی|博彩|赌场",
    re.IGNORECASE,
)
GAMBLING_DOMAIN_RE = re.compile(r"bet|casino|nhacai|nohu|taixiu|xoso|lode|slot|poker|baccarat|w88|fb88|jun88|hi88|new88", re.IGNORECASE)
CREDENTIAL_RE = re.compile(r"mật khẩu|otp|số thẻ|cvv|cccd|seed|cụm từ khôi phục|password|private key", re.IGNORECASE)


def assess(prompt: str) -> dict:
    fields = parse_metadata(prompt)
    probs = classify(model_text(prompt, fields))
    p_legit = probs.get("legitimate", 0.0)
    unwanted = probs.get("fraud", 0.0) + probs.get("spam", 0.0)

    if unwanted < UNWANTED_MIN:
        choice, confidence = "clean", p_legit
    elif GAMBLING_RE.search(prompt) or GAMBLING_DOMAIN_RE.search(fields.get("tên miền", "")):
        choice, confidence = "gambling", unwanted
    elif CREDENTIAL_RE.search(fields.get("biểu mẫu", "")) or "Telegram bot" in prompt:
        choice, confidence = "credential_theft", unwanted
    else:
        choice, confidence = "scam", unwanted

    return {
        "is_phishing": {"probability": round(unwanted, 4)},
        "risk_vector": {
            "choice": choice,
            "confidence": round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in probs.items()},
        },
        # 4.0 = mô hình chắc chắn hợp pháp, 1.0 = chắc chắn lừa đảo/spam
        "trust_score": {"score": round(1 + 3 * p_legit, 2), "confidence": round(abs(p_legit - 0.5) * 2, 4)},
    }


# ------------------------------------------------------------------ OpenAI-compatible cho OmniRoute
@app.get("/v1/models")
def list_models():
    return {"object": "list", "data": [{
        "id": "veritytrust-fast-decision", "object": "model",
        "created": int(time.time()), "owned_by": "veritytrust",
    }]}


@app.post("/v1/chat/completions")
def chat_completions(req: dict):
    user_prompt = next((m.get("content", "") for m in reversed(req.get("messages", [])) if m.get("role") == "user"), "")
    content_str = json.dumps(assess(user_prompt), ensure_ascii=False)
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.get("model", "veritytrust-fast-decision"),
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content_str}, "finish_reason": "stop"}],
        "usage": {
            "prompt_tokens": len(user_prompt.split()),
            "completion_tokens": len(content_str.split()),
            "total_tokens": len(user_prompt.split()) + len(content_str.split()),
        },
    }


@app.post("/v1/classify")
def classify_raw(req: dict):
    """Xác suất thô của mô hình cho một đoạn văn bản bất kỳ: {"text": "..."}"""
    return classify(req.get("text", ""))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
