import fs from 'node:fs';
import path from 'node:path';
import { analyzeLabelShape, getDomainParts } from './domainRules.ts';
import { deserializeModel, forward, hashKeys, type HashedFeatures, type HashedMlpWeights } from './hashedMlp.ts';

export type UrlModelWeights = HashedMlpWeights;
export type UrlFeatures = HashedFeatures;

// ============================================================================
// MÔ HÌNH HỌC SÂU NHẬN DIỆN TÊN MIỀN LỪA ĐẢO (character n-gram embedding + MLP)
//
//   tên miền chủ sở hữu ─► n-gram ký tự (3-5) + token ─► hash ─► Embedding (B x D) ─► mean pool ─┐
//                          10 đặc trưng cấu trúc (độ dài, tỉ lệ số, entropy...) ─────────────────┴► Dense(H, ReLU) ─► Dense(1, sigmoid)
//
// Huấn luyện bằng scripts/train-url-model.ts trên Phishing.Database (nhãn 1) và Tranco (nhãn 0).
// Phần featurize dùng chung cho huấn luyện và suy luận để bảo đảm khớp tuyệt đối.
// ============================================================================

export const DENSE_FEATURES = 10;

function shannonEntropy(s: string): number {
  if (!s) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  let e = 0;
  for (const c of counts.values()) {
    const p = c / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

/** Chuẩn hoá về tên miền chủ sở hữu, vd "a.b.kucoin-help.webflow.io" -> "kucoin-help.webflow.io" */
export function modelInputDomain(hostname: string): string {
  return getDomainParts(hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')).ownerDomain;
}

export function featurize(domain: string, buckets: number): UrlFeatures {
  const parts = getDomainParts(domain);
  const s = `<${domain}>`;
  const keys: string[] = [];
  for (let n = 3; n <= 5; n++) {
    for (let i = 0; i + n <= s.length; i++) keys.push(`c${n}:${s.slice(i, i + n)}`);
  }
  for (const tok of domain.split(/[.\-_]/)) if (tok) keys.push(`t:${tok}`);
  keys.push(`sfx:${parts.publicSuffix}`, `own:${parts.ownerLabel}`, `free:${parts.isFreeHosting ? 1 : 0}`);

  const ids = hashKeys(keys, buckets);

  const label = parts.ownerLabel;
  const shape = analyzeLabelShape(label);
  const letters = (label.match(/[a-z]/g) || []).length;
  const vowels = (label.match(/[aeiouy]/g) || []).length;
  const dense = new Float32Array(DENSE_FEATURES);
  dense[0] = Math.min(domain.length, 80) / 40;
  dense[1] = Math.min(domain.split('.').length, 8) / 4;
  dense[2] = label.length ? shape.digits / label.length : 0;
  dense[3] = Math.min(shape.hyphens, 8) / 4;
  dense[4] = letters ? vowels / letters : 0;
  dense[5] = shannonEntropy(label) / 4;
  dense[6] = parts.isFreeHosting ? 1 : 0;
  dense[7] = Math.min(label.length, 64) / 32;
  dense[8] = Math.min(shape.letterDigitSwitches, 8) / 4;
  dense[9] = parts.isIdn || parts.isIp ? 1 : 0;
  return { ids, dense };
}

// ---------------------------------------------------------------------------
// Suy luận trong server (nạp lười, một lần)
// ---------------------------------------------------------------------------
const MODEL_PATH = path.resolve(process.env.URL_MODEL_PATH || 'server/models/phishing-domain-model.bin.gz');
let loaded: { model: HashedMlpWeights; meta: any } | null | undefined;

function getModel() {
  if (loaded !== undefined) return loaded;
  try {
    loaded = process.env.URL_MODEL === 'off' ? null : deserializeModel(fs.readFileSync(MODEL_PATH));
    if (loaded) console.log(`[URL Model] 🧠 Đã nạp mô hình học sâu (${loaded.meta.trainedAt}, val AUC ${loaded.meta.validation?.auc}).`);
  } catch (err: any) {
    console.warn(`[URL Model] Không nạp được mô hình ${MODEL_PATH}: ${err?.message}`);
    loaded = null;
  }
  return loaded;
}

/** Xác suất (0-1) tên miền thuộc lớp lừa đảo theo mô hình, hoặc null nếu chưa có mô hình. */
export function predictPhishingProbability(hostname: string): number | null {
  const m = getModel();
  if (!m) return null;
  const domain = modelInputDomain(hostname);
  return forward(m.model, featurize(domain, m.model.buckets));
}

export function urlModelInfo() {
  return getModel()?.meta ?? null;
}
