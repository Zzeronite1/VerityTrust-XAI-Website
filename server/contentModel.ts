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

function tokenize(s: string): string[] {
  return s.toLowerCase().normalize('NFC').replace(/\d/g, '0').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function stripDiacritics(w: string): string {
  return w.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

export function featurizeContent(c: ContentInput, buckets: number): HashedFeatures {
  const keys: string[] = [];
  const addTokens = (prefix: string, toks: string[], bigrams: boolean) => {
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      keys.push(`${prefix}:${w}`);
      const plain = stripDiacritics(w);
      if (plain !== w) keys.push(`S:${plain}`);
      else keys.push(`S:${w}`);
      if (bigrams && i > 0) keys.push(`B:${toks[i - 1]}_${w}`);
      // Chữ Hán không có dấu cách: thêm bigram ký tự
      if (/\p{Script=Han}/u.test(w)) {
        for (let k = 0; k + 2 <= w.length; k++) keys.push(`H:${w.slice(k, k + 2)}`);
      }
    }
  };
  addTokens('T', tokenize(c.title), true);
  addTokens('D', tokenize(c.description), true);
  addTokens('W', tokenize(c.text).slice(0, MAX_BODY_TOKENS), true);
  if (!keys.length) keys.push('EMPTY');

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
  return { ids: hashKeys(keys, buckets), dense };
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
