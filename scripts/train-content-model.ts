/**
 * Huấn luyện mô hình học sâu đọc nội dung trang (server/contentModel.ts) trên kho dữ liệu chưng cất từ tri thức
 * (scripts/content-corpus.ts). Đánh giá thật sự trên trang web thật bằng scripts/eval-content-model.ts.
 *
 *   npx tsx scripts/train-content-model.ts [--samples 80000] [--epochs 3] [--buckets 65536] [--dim 48] [--hidden 48]
 *     [--real .cache/training/real-pages.jsonl] [--real-weight 3]
 *
 * --real: trộn thêm trang THẬT do scripts/collect-pages.ts thu thập. Tách 80/20 theo tên miền chủ sở hữu
 * (cùng một tên miền không bao giờ nằm ở cả train lẫn test); 20% còn lại là tập kiểm tra trên dữ liệu thật.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CORPUS_THEMES, generateCorpus } from './content-corpus.ts';
import { CONTENT_DENSE_FEATURES, featurizeContent } from '../server/contentModel.ts';
import { auc, forward, initModel, metricsAt, serializeModel, trainStep, type HashedFeatures } from '../server/hashedMlp.ts';

const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const SAMPLES = parseInt(arg('samples', '80000'), 10);
const EPOCHS = parseInt(arg('epochs', '3'), 10);
// Label smoothing: dữ liệu tổng hợp dễ tách hơn thế giới thật, tránh để mô hình trở nên quá tự tin
const SMOOTH = parseFloat(arg('label-smoothing', '0.05'));
const BUCKETS = parseInt(arg('buckets', String(1 << 16)), 10);
const DIM = parseInt(arg('dim', '48'), 10);
const HIDDEN = parseInt(arg('hidden', '48'), 10);
const LR = parseFloat(arg('lr', '0.2'));
const STRUCT_SWAP = parseFloat(arg('struct-swap', '0.25'));
const WEIGHT_DECAY = parseFloat(arg('weight-decay', '5e-5'));
const REAL = arg('real', '');
const REAL_WEIGHT = parseInt(arg('real-weight', '3'), 10);
const OUT = arg('out', path.join(import.meta.dirname, '../server/models/phishing-content-model.bin.gz'));

let seed = 99991;
const rand = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

// Tối ưu RAM: chỉ giữ lại đặc trưng số (Float32/Uint32), giải phóng chuỗi văn bản thô ngay lập tức
interface CompactItem {
  label: 0 | 1;
  theme: string;
  f: HashedFeatures;
}

console.log(`Đang nạp và số hóa dữ liệu huấn luyện (${SAMPLES.toLocaleString()} mẫu)...`);
const trainSet: CompactItem[] = generateCorpus(SAMPLES, 1).map(s => ({
  label: s.label,
  theme: s.theme,
  f: featurizeContent(s, BUCKETS),
}));
const valSet: CompactItem[] = generateCorpus(Math.round(SAMPLES / 8), 777).map(s => ({
  label: s.label,
  theme: s.theme,
  f: featurizeContent(s, BUCKETS),
}));

// ---------------------------------------------------------------- trang thật (tuỳ chọn)
const realTest: CompactItem[] = [];
let realTrainCount = 0;
if (REAL) {
  const ownerBucket = (owner: string) => {
    let h = 0;
    for (let i = 0; i < owner.length; i++) h = (h * 31 + owner.charCodeAt(i)) >>> 0;
    return h % 5;
  };
  for (const line of fs.readFileSync(REAL, 'utf8').split('\n')) {
    if (!line) continue;
    const r = JSON.parse(line);
    if (!r.html) continue;
    const item: CompactItem = { label: r.label, theme: r.label ? 'real_phishing' : 'real_legit', f: featurizeContent(r.html, BUCKETS) };
    if (ownerBucket(r.owner) === 0) {
      realTest.push(item);
    } else {
      // Lặp lại trang thật REAL_WEIGHT lần để chúng có tiếng nói tương xứng bên cạnh dữ liệu tổng hợp
      for (let k = 0; k < REAL_WEIGHT; k++) trainSet.push(item);
      realTrainCount++;
    }
  }
  console.log(`Trang thật: ${realTrainCount.toLocaleString()} trang huấn luyện (x${REAL_WEIGHT}), ${realTest.length.toLocaleString()} trang kiểm tra (tên miền chưa từng thấy).`);
}
console.log(`Kho dữ liệu: ${trainSet.length.toLocaleString()} mẫu huấn luyện, ${valSet.length.toLocaleString()} mẫu validation.`);
console.log(`Bộ nhớ RAM: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB (cực nhẹ, an toàn tuyệt đối cho máy tính).`);
console.log(`Kịch bản lừa đảo (${CORPUS_THEMES.phishing.length}): ${CORPUS_THEMES.phishing.join(', ')}`);
console.log(`Loại trang hợp pháp (${CORPUS_THEMES.legit.length}): ${CORPUS_THEMES.legit.join(', ')}`);

const inDim = DIM + CONTENT_DENSE_FEATURES;
const m = initModel(BUCKETS, DIM, HIDDEN, CONTENT_DENSE_FEATURES, rand, true);
const x = new Float32Array(inDim), h = new Float32Array(HIDDEN), dh = new Float32Array(HIDDEN), dx = new Float32Array(inDim);
const totalSteps = EPOCHS * trainSet.length;
let step = 0;
for (let epoch = 1; epoch <= EPOCHS; epoch++) {
  for (let i = trainSet.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [trainSet[i], trainSet[j]] = [trainSet[j], trainSet[i]];
  }
  let loss = 0;
  const t0 = Date.now();
  for (const item of trainSet) {
    // "Tráo cấu trúc": 25% mẫu mượn đặc trưng cấu trúc của một mẫu ngẫu nhiên khác (bất kể lớp),
    // buộc mạng phải đọc nội dung chữ thay vì chỉ dựa vào hình dạng trang
    let input: HashedFeatures = rand() < STRUCT_SWAP
      ? { ids: item.f.ids, weights: item.f.weights, dense: trainSet[Math.floor(rand() * trainSet.length)].f.dense }
      : item.f;
    // Word dropout: 20% mẫu bị rơi ngẫu nhiên một phần từ vựng, giúp mô hình mạnh mẽ khi gặp trang thiếu từ
    if (rand() < 0.20 && input.ids.length > 2) {
      const keptIndices: number[] = [];
      for (let k = 0; k < input.ids.length; k++) {
        if (rand() > 0.35) keptIndices.push(k);
      }
      if (!keptIndices.length) keptIndices.push(0);
      const keptIds = new Uint32Array(keptIndices.length);
      const keptWeights = input.weights ? new Float32Array(keptIndices.length) : undefined;
      for (let k = 0; k < keptIndices.length; k++) {
        keptIds[k] = input.ids[keptIndices[k]];
        if (keptWeights && input.weights) keptWeights[k] = input.weights[keptIndices[k]];
      }
      input = { ids: keptIds, weights: keptWeights, dense: input.dense };
    }
    loss += trainStep(m, input, item.label === 1 ? 1 - SMOOTH : SMOOTH, LR * (1 - step / totalSteps) + 1e-4, x, h, dh, dx, WEIGHT_DECAY);
    step++;
  }
  const scores = valSet.map(v => forward(m, v.f));
  const labels = valSet.map(v => v.label);
  const realAuc = realTest.length ? `, AUC trang thật ${auc(realTest.map(v => forward(m, v.f)), realTest.map(v => v.label)).toFixed(4)}` : '';
  console.log(`Epoch ${epoch}/${EPOCHS}: loss ${(loss / trainSet.length).toFixed(4)}, val AUC ${auc(scores, labels).toFixed(4)}, val acc ${metricsAt(scores, labels, 0.5).accuracy}${realAuc} (${((Date.now() - t0) / 1000).toFixed(1)}s, RAM: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB)`);
}

const scores = valSet.map(v => forward(m, v.f));
const labels = valSet.map(v => v.label);
const byTheme: Record<string, string> = {};
for (const theme of [...CORPUS_THEMES.phishing, ...CORPUS_THEMES.legit, 'news_about_scams', 'ecommerce_promo']) {
  const idx = valSet.map((v, i) => (v.theme === theme ? i : -1)).filter(i => i >= 0);
  if (!idx.length) continue;
  const correct = idx.filter(i => (scores[i] >= 0.5 ? 1 : 0) === labels[i]).length;
  byTheme[theme] = `${correct}/${idx.length}`;
}
const realScores = realTest.map(v => forward(m, v.f));
const realLabels = realTest.map(v => v.label);
const realValidation = realTest.length ? {
  samples: realTest.length,
  phishing: realLabels.filter(l => l === 1).length,
  legit: realLabels.filter(l => l === 0).length,
  auc: +auc(realScores, realLabels).toFixed(4),
  at: [0.5, 0.75, 0.9].map(t => metricsAt(realScores, realLabels, t)),
} : null;
const validation = { samples: valSet.length, auc: +auc(scores, labels).toFixed(4), at: [0.5, 0.75, 0.9].map(t => metricsAt(scores, labels, t)), byTheme, real: realValidation };
console.log('Validation (dữ liệu tổng hợp):', JSON.stringify({ ...validation, real: undefined }));
if (realValidation) console.log('Kiểm tra trên TRANG THẬT (tên miền chưa từng thấy):', JSON.stringify(realValidation, null, 1));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buf = serializeModel(m, {
  trainedAt: new Date().toISOString().slice(0, 10),
  source: REAL
    ? `Dữ liệu tổng hợp (scripts/content-corpus.ts) + ${realTrainCount} trang thật (scripts/collect-pages.ts)`
    : 'Kho dữ liệu chưng cất từ tri thức về các chiến dịch lừa đảo (scripts/content-corpus.ts)',
  trainSamples: trainSet.length,
  realTrainPages: realTrainCount,
  epochs: EPOCHS,
  validation,
});
fs.writeFileSync(OUT, buf);
console.log(`Đã lưu mô hình: ${OUT} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
