# API

[← Về README](../README.md)

Máy chủ mặc định chạy ở `http://localhost:3000`. Mọi endpoint nhận và trả JSON. Các endpoint quét bị giới hạn tần suất theo IP (`RATE_LIMIT_PER_MIN`, mặc định 30 lượt/phút; đặt `0` để tắt).

| Endpoint | Dùng để |
|---|---|
| `POST /api/analyze` | **Thẩm định một đường link** — endpoint chính |
| `POST /api/explain` | Nhờ AI giải thích kết quả vừa thẩm định (Tầng 5) |
| `POST /api/scan` | Báo cáo đầy đủ cho URL, văn bản hoặc file (điều khoản dịch vụ, hợp đồng…) |
| `POST /api/translate`, `POST /api/translate-report` | Dịch nội dung / báo cáo |
| `POST /api/feedback` | Gửi phản hồi về kết quả |

---

## `POST /api/analyze`

```bash
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"url":"tinhte.vn"}'
```

**Tham số:** `url` (bắt buộc). Có thể bỏ `https://`. Chỉ chấp nhận `http://` và `https://`.

**Kết quả (rút gọn):**

```json
{
  "analyzed_url": "https://tinhte.vn/",
  "trust_score": 96,
  "status": "Safe",
  "analysis_engine": "Verity Evidence Engine (DNS · TLS · RDAP · Tranco · Threat Intel)",
  "summary": "…",
  "red_flags": [],
  "recommendations": ["…"],
  "certificates": ["…"],
  "score_breakdown": {
    "evidence_score": 96,
    "verdict": "legit",
    "evidence_completeness": 100,
    "factors": [{ "id": "popularity", "delta": 14, "label": "Tên miền phổ biến toàn cầu", "detail": "…" }]
  },
  "pipeline": {
    "exit_tier": 2,
    "exit_reason": "Kết luận theo bằng chứng kỹ thuật (96/100)",
    "total_ms": 412,
    "rendered_by_headless": false,
    "tiers": [{ "tier": 0, "name": "NetSafety & Phân giải DNS", "status": "passed", "ms": 40, "note": "…" }]
  },
  "technical_evidence": { "owner_domain": "tinhte.vn", "final_url": "https://tinhte.vn/", "popularity_rank": 23456, "…": "…" }
}
```

| Trường | Ý nghĩa |
|---|---|
| `trust_score` | Điểm tin cậy 0–100 |
| `status` | `Safe` (≥ 75) · `Warning` (50–74) · `Dangerous` (< 50) |
| `red_flags` | Các dấu hiệu nguy hiểm, viết bằng lời |
| `score_breakdown.factors` | Từng bằng chứng và số điểm cộng/trừ — xem [CHAM-DIEM.md](CHAM-DIEM.md) |
| `score_breakdown.verdict` | `trusted` · `legit` · `unknown` · `suspicious` · `phishing` · `gambling` · `malicious` · `unreachable` |
| `pipeline` | Hành trình qua các tầng — xem [KIEN-TRUC.md](KIEN-TRUC.md) |
| `technical_evidence` | Dữ liệu kỹ thuật thô: DNS, TLS, tuổi tên miền, độ phổ biến… |

**Lỗi:** `400` khi thiếu `url` hoặc giao thức không được hỗ trợ; `429` khi vượt giới hạn tần suất.

---

## `POST /api/explain`

Nên gọi **sau** `/api/analyze` với cùng `url`: máy chủ giữ ngữ cảnh lần thẩm định gần nhất của mỗi URL trong 30 phút. Nếu chưa có ngữ cảnh, máy chủ tự thẩm định trước.

```bash
curl -X POST http://localhost:3000/api/explain -H "Content-Type: application/json" -d '{"url":"tinhte.vn"}'
```

```json
{ "explanation": "Đoạn 1…\n\nĐoạn 2…" }
```

- Có `GEMINI_API_KEY` hoặc `OPENROUTER_API_KEY` → AI viết lời giải thích.
- Không có key → trả về bản giải thích soạn từ bảng bằng chứng.
- Lời giải thích **không bao giờ thay đổi điểm số**.

---

## `POST /api/scan`

Báo cáo đầy đủ hơn: dành cho người tiêu dùng hoặc doanh nghiệp, có thể phân tích văn bản/file như điều khoản dịch vụ hay hợp đồng.

| Tham số | Mô tả |
|---|---|
| `targetValue` (hoặc `url`, `input`) | URL hoặc văn bản cần phân tích |
| `targetType` | `url` (mặc định khi có giá trị) hoặc `text` |
| `fileData`, `mimeType` | File đính kèm dạng base64 |
| `persona` | `consumer` (mặc định) … |
| `engineMode` | `deep` (mặc định): kết hợp thêm phân tích AI nếu có API key |
| `lang` | `vi` (mặc định) |

Với URL, `/api/scan` dùng cùng đường ống nhiều tầng như `/api/analyze`.
