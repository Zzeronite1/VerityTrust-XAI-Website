import zlib from 'node:zlib';

// ============================================================================
// LÕI MẠNG NƠ-RON DÙNG CHUNG (mô hình tên miền + mô hình nội dung trang)
//
//   đặc trưng rời rạc (n-gram, từ...) ─► hash ─► Embedding (buckets x dim) ─► mean pool ─┐
//   đặc trưng số (denseDim) ──────────────────────────────────────────────────────────────┴► Dense(hidden, ReLU) ─► Dense(1, sigmoid)
// ============================================================================

export interface HashedFeatures {
  ids: Uint32Array;
  dense: Float32Array;
}

export interface HashedMlpWeights {
  buckets: number;
  dim: number;
  hidden: number;
  denseDim: number;
  embedding: Float32Array; // buckets * dim
  w1: Float32Array;        // hidden * (dim + denseDim)
  b1: Float32Array;        // hidden
  w2: Float32Array;        // hidden
  b2: number;
}

export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashKeys(keys: string[], buckets: number): Uint32Array {
  const ids = new Uint32Array(keys.length);
  for (let i = 0; i < keys.length; i++) ids[i] = fnv1a(keys[i]) % buckets;
  return ids;
}

/** Lan truyền xuôi; trả về xác suất lớp 1 và (tuỳ chọn) ghi giá trị trung gian vào cache cho huấn luyện. */
export function forward(m: HashedMlpWeights, f: HashedFeatures, cache?: { x: Float32Array; h: Float32Array }): number {
  const inDim = m.dim + m.denseDim;
  const x = cache?.x ?? new Float32Array(inDim);
  x.fill(0);
  const n = f.ids.length || 1;
  for (let k = 0; k < f.ids.length; k++) {
    const base = f.ids[k] * m.dim;
    for (let d = 0; d < m.dim; d++) x[d] += m.embedding[base + d];
  }
  for (let d = 0; d < m.dim; d++) x[d] /= n;
  for (let j = 0; j < m.denseDim; j++) x[m.dim + j] = f.dense[j];

  const h = cache?.h ?? new Float32Array(m.hidden);
  let z = m.b2;
  for (let i = 0; i < m.hidden; i++) {
    let a = m.b1[i];
    const row = i * inDim;
    for (let j = 0; j < inDim; j++) a += m.w1[row + j] * x[j];
    h[i] = a > 0 ? a : 0;
    z += m.w2[i] * h[i];
  }
  return 1 / (1 + Math.exp(-z));
}

/** Một bước SGD với hàm mất mát binary cross-entropy (lan truyền ngược viết tay, đã kiểm tra gradient). */
export function trainStep(
  m: HashedMlpWeights, f: HashedFeatures, y: number, lr: number,
  x: Float32Array, h: Float32Array, dh: Float32Array, dx: Float32Array,
  weightDecay = 0,
): number {
  const p = forward(m, f, { x, h });
  const inDim = m.dim + m.denseDim;
  const dz = p - y; // đạo hàm BCE theo logit
  for (let i = 0; i < m.hidden; i++) dh[i] = h[i] > 0 ? dz * m.w2[i] : 0;
  dx.fill(0);
  for (let i = 0; i < m.hidden; i++) {
    if (dh[i] === 0) continue;
    const row = i * inDim;
    for (let j = 0; j < inDim; j++) {
      dx[j] += m.w1[row + j] * dh[i];
      m.w1[row + j] -= lr * (dh[i] * x[j] + weightDecay * m.w1[row + j]);
    }
    m.b1[i] -= lr * (dh[i] + weightDecay * m.b1[i]);
  }
  for (let i = 0; i < m.hidden; i++) m.w2[i] -= lr * (dz * h[i] + weightDecay * m.w2[i]);
  m.b2 -= lr * (dz + weightDecay * m.b2);
  const n = f.ids.length || 1;
  for (let k = 0; k < f.ids.length; k++) {
    const base = f.ids[k] * m.dim;
    for (let d = 0; d < m.dim; d++) m.embedding[base + d] -= (lr * dx[d]) / n + lr * weightDecay * m.embedding[base + d];
  }
  const pc = Math.min(Math.max(p, 1e-7), 1 - 1e-7);
  return -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
}

/**
 * Khởi tạo trọng số. zeroEmbedding = true: các đặc trưng chưa từng gặp khi huấn luyện đóng góp 0 (trung tính)
 * thay vì một vector ngẫu nhiên - quan trọng khi dữ liệu thật có nhiều từ vựng ngoài tập huấn luyện.
 */
export function initModel(buckets: number, dim: number, hidden: number, denseDim: number, rand: () => number, zeroEmbedding = false): HashedMlpWeights {
  const randn = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const inDim = dim + denseDim;
  return {
    buckets,
    dim,
    hidden,
    denseDim,
    embedding: zeroEmbedding ? new Float32Array(buckets * dim) : Float32Array.from({ length: buckets * dim }, () => (rand() - 0.5) * 0.2),
    w1: Float32Array.from({ length: hidden * inDim }, () => randn() * Math.sqrt(2 / inDim)),
    b1: new Float32Array(hidden),
    w2: Float32Array.from({ length: hidden }, () => randn() * Math.sqrt(1 / hidden)),
    b2: 0,
  };
}

// ---------------------------------------------------------------------------
// Định dạng file: gzip( header JSON + "\n" + nhị phân )
// Embedding lượng tử hoá int8 với hệ số scale riêng cho từng hàng; các lớp Dense giữ float32.
// ---------------------------------------------------------------------------
export function serializeModel(m: HashedMlpWeights, meta: Record<string, unknown>): Buffer {
  const scales = new Float32Array(m.buckets);
  const q = new Int8Array(m.buckets * m.dim);
  for (let r = 0; r < m.buckets; r++) {
    let max = 0;
    for (let d = 0; d < m.dim; d++) max = Math.max(max, Math.abs(m.embedding[r * m.dim + d]));
    const scale = max / 127 || 1;
    scales[r] = scale;
    for (let d = 0; d < m.dim; d++) q[r * m.dim + d] = Math.round(m.embedding[r * m.dim + d] / scale);
  }
  const header = Buffer.from(JSON.stringify({ ...meta, buckets: m.buckets, dim: m.dim, hidden: m.hidden, denseFeatures: m.denseDim, b2: m.b2 }) + '\n');
  const body = Buffer.concat([
    Buffer.from(scales.buffer),
    Buffer.from(q.buffer),
    Buffer.from(m.w1.buffer),
    Buffer.from(m.b1.buffer),
    Buffer.from(m.w2.buffer),
  ]);
  return zlib.gzipSync(Buffer.concat([header, body]), { level: 9 });
}

export function deserializeModel(file: Buffer): { model: HashedMlpWeights; meta: any } {
  const raw = zlib.gunzipSync(file);
  const nl = raw.indexOf(10);
  const meta = JSON.parse(raw.subarray(0, nl).toString('utf8'));
  // Sao chép sang buffer mới để bảo đảm căn lề (alignment) cho typed array
  const bin = new Uint8Array(raw.subarray(nl + 1));
  const { buckets, dim, hidden } = meta;
  const denseDim = meta.denseFeatures;
  const inDim = dim + denseDim;
  let off = 0;
  const take = (bytes: number) => bin.buffer.slice(off, (off += bytes));
  const scales = new Float32Array(take(buckets * 4));
  const q = new Int8Array(take(buckets * dim));
  const w1 = new Float32Array(take(hidden * inDim * 4));
  const b1 = new Float32Array(take(hidden * 4));
  const w2 = new Float32Array(take(hidden * 4));
  const embedding = new Float32Array(buckets * dim);
  for (let r = 0; r < buckets; r++) {
    for (let d = 0; d < dim; d++) embedding[r * dim + d] = q[r * dim + d] * scales[r];
  }
  return { model: { buckets, dim, hidden, denseDim, embedding, w1, b1, w2, b2: meta.b2 }, meta };
}

// ---------------------------------------------------------------------------
// Đo lường (dùng cho script huấn luyện/đánh giá)
// ---------------------------------------------------------------------------
export function auc(scores: number[], labels: number[]): number {
  const idx = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  let rankSum = 0;
  let pos = 0;
  idx.forEach((i, r) => {
    if (labels[i] === 1) {
      rankSum += r + 1;
      pos++;
    }
  });
  const neg = labels.length - pos;
  return pos && neg ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : NaN;
}

export function metricsAt(scores: number[], labels: number[], t: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  scores.forEach((s, i) => {
    const pred = s >= t ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 1) fp++;
    else if (labels[i] === 1) fn++;
    else tn++;
  });
  return {
    threshold: t,
    accuracy: +((tp + tn) / Math.max(1, scores.length)).toFixed(4),
    precision: +(tp / Math.max(1, tp + fp)).toFixed(4),
    recall: +(tp / Math.max(1, tp + fn)).toFixed(4),
    falsePositiveRate: +(fp / Math.max(1, fp + tn)).toFixed(4),
  };
}
