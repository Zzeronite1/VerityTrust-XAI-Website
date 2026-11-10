import fs from 'node:fs';
import path from 'node:path';
import { deserializeModel, forward, hashKeys, type HashedFeatures, type HashedMlpWeights } from './hashedMlp.ts';

// ============================================================================
// MÔ HÌNH HỌC SÂU ĐỌC NỘI DUNG TRANG
// Đầu vào: tiêu đề, mô tả, văn bản trang (từ đơn, cặp từ, bản bỏ dấu tiếng Việt, bigram chữ Hán)
//          + 20 đặc trưng cấu trúc (ô mật khẩu, OTP/thẻ/cụm từ khôi phục, form gửi ra ngoài, liên kết rỗng...)
// Huấn luyện bằng scripts/train-content-model.ts trên kho dữ liệu chưng cất từ tri thức (scripts/content-corpus.ts).
// ============================================================================

export const CONTENT_DENSE_FEATURES = 20;
const MAX_BODY_TOKENS = 350;

export interface ContentInput {
  title: string;
  description: string;
  text: string;
  hasPasswordField: boolean;
  sensitiveFields: string[];
  externalFormAction: boolean | string | null;
  telegramExfiltration: boolean;
  formCount: number;
  textLength: number;
  linkCount: number;
  nullLinkRatio: number;
  externalLinkRatio: number;
  iframeCount: number;
  obfuscationSignals: number;
  moitBadge: boolean;
  taxId: boolean;
  contactInfo: boolean;
  policyLinks: boolean;
  botChallenge: boolean;
}

const STOPWORDS = new Set([
  'và', 'của', 'có', 'cho', 'với', 'các', 'những', 'được', 'trong', 'này', 'đã', 'sẽ', 'không', 'một',
  'người', 'năm', 'ngày', 'tháng', 'nhiều', 'khi', 'về', 'như', 'tại', 'thì', 'ở', 'đó', 'từ', 'ra',
  'the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'about', 'is', 'are', 'was',
  'be', 'been', 'this', 'that', 'it', 'as', 'an', 'or', 'all'
]);

function tokenize(s: string): string[] {
  // Chuẩn hóa leetspeak chèn dấu chấm/gạch giữa các ký tự: v.c.b -> vcb, o-t-p -> otp
  const normalized = s.replace(/([a-zA-Z0-9\p{L}])[._\-\s]([a-zA-Z0-9\p{L}])[._\-\s]([a-zA-Z0-9\p{L}])/gu, '$1$2$3');
  return normalized.toLowerCase().normalize('NFC').replace(/\d/g, '0').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function stripDiacritics(w: string): string {
  return w.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

export function featurizeContent(c: ContentInput, buckets: number): HashedFeatures {
  const keys: string[] = [];
  const weights: number[] = [];

  const addTokens = (prefix: string, toks: string[], baseWeight: number, bigrams: boolean) => {
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      const isStop = STOPWORDS.has(w);
      const isKeyAttackTerm = w === 'otp' || w === 'password' || w === 'telegram' || w === 'zalo' || w === 'input' || w === 'button';
      const wWeight = isKeyAttackTerm ? baseWeight * 2.0 : isStop ? 0.15 : baseWeight;

      keys.push(`${prefix}:${w}`);
      weights.push(wWeight);

      const plain = stripDiacritics(w);
      if (plain !== w) {
        keys.push(`S:${plain}`);
        weights.push(wWeight * 0.9);
      }

      // Trích xuất subword 3-grams (ký tự con) cho từ dài >= 4 ký tự:
      // Giúp nhận diện typo, teencode và từ vựng mới lạ giống hệt tokenizer BPE của Transformer
      if (w.length >= 4 && !isStop && w.length <= 15) {
        for (let k = 0; k + 3 <= w.length; k++) {
          keys.push(`C:${w.slice(k, k + 3)}`);
          weights.push(0.5);
        }
      }

      if (bigrams && i > 0) {
        keys.push(`B:${toks[i - 1]}_${w}`);
        weights.push(isStop ? 0.3 : baseWeight * 1.2);
      }

      // Chữ Hán không có dấu cách: thêm bigram ký tự
      if (/\p{Script=Han}/u.test(w)) {
        for (let k = 0; k + 2 <= w.length; k++) {
          keys.push(`H:${w.slice(k, k + 2)}`);
          weights.push(baseWeight * 1.2);
        }
      }
    }
  };

  // Tiêu đề trang (T) và nút bấm/form có trọng số chú ý (Attention Weight) cao gấp 2 lần văn bản thân (W)
  addTokens('T', tokenize(c.title), 2.2, true);
  addTokens('D', tokenize(c.description), 1.6, true);
  addTokens('W', tokenize(c.text).slice(0, MAX_BODY_TOKENS), 1.0, true);

  if (!keys.length) {
    keys.push('EMPTY');
    weights.push(1.0);
  }

  const sensitive = new Set(c.sensitiveFields);
  const dense = new Float32Array(CONTENT_DENSE_FEATURES);
  dense[0] = c.hasPasswordField ? 1 : 0;
  dense[1] = Math.min(sensitive.size, 3) / 3;
  dense[2] = sensitive.has('OTP') ? 1 : 0;
  dense[3] = sensitive.has('Thẻ thanh toán') || sensitive.has('Mã PIN') ? 1 : 0;
  dense[4] = sensitive.has('Cụm từ khôi phục ví') ? 1 : 0;
  dense[5] = sensitive.has('Giấy tờ tùy thân') ? 1 : 0;
  dense[6] = c.externalFormAction ? 1 : 0;
  dense[7] = c.telegramExfiltration ? 1 : 0;
  dense[8] = Math.min(c.formCount, 3) / 3;
  dense[9] = Math.log1p(c.textLength) / 10;
  dense[10] = Math.log1p(c.linkCount) / 6;
  dense[11] = c.nullLinkRatio;
  dense[12] = c.externalLinkRatio;
  dense[13] = c.iframeCount > 0 ? 1 : 0;
  dense[14] = Math.min(c.obfuscationSignals, 2) / 2;
  dense[15] = c.moitBadge ? 1 : 0;
  dense[16] = c.taxId ? 1 : 0;
  dense[17] = c.contactInfo ? 1 : 0;
  dense[18] = c.policyLinks ? 1 : 0;
  dense[19] = c.botChallenge ? 1 : 0;

  return {
    ids: hashKeys(keys, buckets),
    weights: new Float32Array(weights),
    dense,
  };
}

const MODEL_PATH = path.resolve(process.env.CONTENT_MODEL_PATH || 'server/models/phishing-content-model.bin.gz');
let loaded: { model: HashedMlpWeights; meta: any } | null | undefined;

function getModel() {
  if (loaded !== undefined) return loaded;
  try {
    loaded = process.env.CONTENT_MODEL === 'off' ? null : deserializeModel(fs.readFileSync(MODEL_PATH));
    if (loaded) console.log(`[Content Model] 🧠 Đã nạp mô hình đọc nội dung trang (${loaded.meta.trainedAt}, ${loaded.meta.trainSamples} mẫu huấn luyện).`);
  } catch (err: any) {
    console.warn(`[Content Model] Không nạp được mô hình ${MODEL_PATH}: ${err?.message}`);
    loaded = null;
  }
  return loaded;
}

/** Xác suất (0-1) nội dung trang thuộc lớp lừa đảo/nguy hiểm, hoặc null nếu chưa có mô hình. */
export function predictContentRisk(content: ContentInput): number | null {
  const m = getModel();
  if (!m) return null;
  return forward(m.model, featurizeContent(content, m.model.buckets));
}
