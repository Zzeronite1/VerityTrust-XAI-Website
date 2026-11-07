/**
 * Huấn luyện mô hình học sâu nhận diện tên miền lừa đảo (xem server/urlModel.ts).
 *
 *   npx tsx scripts/train-url-model.ts [--epochs 4] [--buckets 131072] [--dim 32] [--hidden 32]
 *     [--pdb phishing-domains.txt] [--tranco top-1m.csv|.zip] [--exclude urls.txt]... [--out server/models/...]
 *
 * Dữ liệu:
 * - Nhãn 1: Phishing.Database (phishing-domains-ACTIVE), quy về "tên miền chủ sở hữu"
 * - Nhãn 0: toàn bộ Tranco top 1 triệu. Cần có cả tên miền chính chủ của thương hiệu lớn (paypal.com...) để mô hình
 *   học được "thương hiệu + đuôi chính thức = hợp pháp", thay vì "cứ có tên thương hiệu là lừa đảo".
 * - Loại khỏi CẢ HAI phía: mọi tên miền trong các tập đánh giá (scripts/eval-*.json và các file --exclude)
 *   để số đo end-to-end không bị rò rỉ dữ liệu.
 */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { parse as parseDomain } from 'tldts';
import { getDomainParts } from '../server/domainRules.ts';
import { DENSE_FEATURES, featurize, modelInputDomain } from '../server/urlModel.ts';
import { auc, forward, initModel, metricsAt, serializeModel, trainStep } from '../server/hashedMlp.ts';

const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const argList = (name: string) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));

const EPOCHS = parseInt(arg('epochs', '3'), 10);
const BUCKETS = parseInt(arg('buckets', String(1 << 17)), 10);
const DIM = parseInt(arg('dim', '32'), 10);
const HIDDEN = parseInt(arg('hidden', '32'), 10);
const LR = parseFloat(arg('lr', '0.2'));
const OUT = arg('out', path.join(import.meta.dirname, '../server/models/phishing-domain-model.bin.gz'));
const CACHE = path.resolve('.cache/training');

// ---------------------------------------------------------------- RNG có seed để kết quả tái lập được
let seed = 1234567;
const rand = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

async function download(url: string, file: string): Promise<Buffer> {
  const full = path.join(CACHE, file);
  if (fs.existsSync(full)) return fs.readFileSync(full);
  console.log(`Tải ${url} ...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(full, buf);
  return buf;
}

async function loadData() {
  const pdbText = arg('pdb', '')
    ? fs.readFileSync(arg('pdb', ''), 'utf8')
    : (await download('https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt', 'phishing-domains-ACTIVE.txt')).toString('utf8');
  let trancoCsv: string;
  const trancoArg = arg('tranco', '');
  if (trancoArg && !trancoArg.endsWith('.zip')) {
    trancoCsv = fs.readFileSync(trancoArg, 'utf8');
  } else {
    const zipBuf = trancoArg ? fs.readFileSync(trancoArg) : await download('https://tranco-list.eu/top-1m.csv.zip', 'tranco-top-1m.csv.zip');
    const zip = await JSZip.loadAsync(zipBuf);
    trancoCsv = await Object.values(zip.files).find(f => f.name.endsWith('.csv'))!.async('string');
  }
  const tranco = trancoCsv.split('\n').map(l => l.slice(l.indexOf(',') + 1).trim().toLowerCase()).filter(Boolean);

  // Tên miền trong mọi tập đánh giá -> loại khỏi dữ liệu huấn luyện
  const excluded = new Set<string>();
  const addExcluded = (value: string) => {
    try {
      const host = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).hostname;
      excluded.add(modelInputDomain(host));
      excluded.add(getDomainParts(host).icannDomain);
    } catch {
      // bỏ qua dòng hỏng
    }
  };
  for (const f of ['eval-dataset.json', 'eval-holdout.json', 'eval-holdout2.json']) {
    const p = path.join(import.meta.dirname, f);
    if (!fs.existsSync(p)) continue;
    const ds = JSON.parse(fs.readFileSync(p, 'utf8'));
    [...(ds.safe || []), ...(ds.dangerous || [])].forEach(addExcluded);
  }
  for (const f of argList('exclude')) fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).forEach(addExcluded);

  const topRank = new Map<string, number>();
  tranco.forEach((d, i) => topRank.set(d, i + 1));

  const positives = new Set<string>();
  const pdbIcann = new Set<string>();
  for (const raw of pdbText.split('\n')) {
    const host = raw.trim().toLowerCase();
    if (!host || host.startsWith('#')) continue;
    const parts = getDomainParts(host);
    pdbIcann.add(parts.icannDomain);
    const owner = modelInputDomain(host);
    // Subdomain bị lạm dụng của nền tảng lớn (docs.google.com...) không phải "tên miền lừa đảo"
    const rank = topRank.get(parts.icannDomain);
    if (!parts.isFreeHosting && rank !== undefined && rank <= 10_000) continue;
    if (excluded.has(owner) || excluded.has(parts.icannDomain)) continue;
    positives.add(owner);
  }

  const negativesAll: string[] = [];
  for (let i = 0; i < tranco.length; i++) {
    const d = tranco[i];
    if (pdbIcann.has(d) || positives.has(d) || excluded.has(d)) continue;
    if (parseDomain(d).isIp) continue;
    negativesAll.push(d);
  }
  // Cân bằng hai lớp
  for (let i = negativesAll.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [negativesAll[i], negativesAll[j]] = [negativesAll[j], negativesAll[i]];
  }
  const negatives = negativesAll.slice(0, positives.size);
  console.log(`Dữ liệu: ${positives.size.toLocaleString()} tên miền lừa đảo, ${negatives.length.toLocaleString()} tên miền hợp pháp, loại ${excluded.size} tên miền thuộc tập đánh giá.`);
  return { positives: [...positives], negatives, excluded };
}

async function main() {
  const { positives, negatives } = await loadData();
  // Chia train/validation theo hash tên miền (cố định, tái lập được)
  const samples = [...positives.map(d => ({ d, y: 1 })), ...negatives.map(d => ({ d, y: 0 }))];
  const isVal = (d: string) => {
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
    return h % 10 === 0;
  };
  const train = samples.filter(s => !isVal(s.d)).map(s => ({ f: featurize(s.d, BUCKETS), y: s.y }));
  const val = samples.filter(s => isVal(s.d)).map(s => ({ d: s.d, f: featurize(s.d, BUCKETS), y: s.y }));
  console.log(`Train ${train.length.toLocaleString()} / Validation ${val.length.toLocaleString()} mẫu. Mô hình: ${BUCKETS} buckets x ${DIM} chiều, lớp ẩn ${HIDDEN}.`);

  const inDim = DIM + DENSE_FEATURES;
  const m = initModel(BUCKETS, DIM, HIDDEN, DENSE_FEATURES, rand);
  const x = new Float32Array(inDim), h = new Float32Array(HIDDEN), dh = new Float32Array(HIDDEN), dx = new Float32Array(inDim);
  const totalSteps = EPOCHS * train.length;
  let step = 0;
  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    for (let i = train.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [train[i], train[j]] = [train[j], train[i]];
    }
    let loss = 0;
    const t0 = Date.now();
    for (const s of train) {
      const lr = LR * (1 - step / totalSteps) + 1e-4;
      loss += trainStep(m, s.f, s.y, lr, x, h, dh, dx);
      step++;
    }
    const valScores = val.map(s => forward(m, s.f));
    const valLabels = val.map(s => s.y);
    console.log(`Epoch ${epoch}/${EPOCHS}: loss ${(loss / train.length).toFixed(4)}, val AUC ${auc(valScores, valLabels).toFixed(4)}, val acc ${metricsAt(valScores, valLabels, 0.5).accuracy} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  const valScores = val.map(s => forward(m, s.f));
  const valLabels = val.map(s => s.y);
  const validation = {
    samples: val.length,
    auc: +auc(valScores, valLabels).toFixed(4),
    at: [0.5, 0.75, 0.9, 0.95].map(t => metricsAt(valScores, valLabels, t)),
  };
  console.log('\nValidation:', JSON.stringify(validation, null, 2));

  // Kiểm tra tách biệt trên các tập đánh giá (không có trong dữ liệu huấn luyện)
  const evalReport: Record<string, unknown> = {};
  for (const f of ['eval-dataset.json', 'eval-holdout.json', 'eval-holdout2.json']) {
    const p = path.join(import.meta.dirname, f);
    if (!fs.existsSync(p)) continue;
    const ds = JSON.parse(fs.readFileSync(p, 'utf8'));
    const scoreOf = (u: string) => forward(m, featurize(modelInputDomain(new URL(/^https?:\/\//.test(u) ? u : `https://${u}`).hostname), BUCKETS));
    const legit = (ds.safe || []).map((u: string) => ({ u, p: scoreOf(u) }));
    evalReport[f] = {
      legitAbove0_9: legit.filter((s: any) => s.p >= 0.9).map((s: any) => `${s.u} (${s.p.toFixed(2)})`),
      legitAbove0_75: legit.filter((s: any) => s.p >= 0.75).length,
      legitCount: legit.length,
    };
  }
  for (const f of argList('exclude')) {
    const urls = fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(l => /^https?:\/\//.test(l));
    const ps = urls.map(u => forward(m, featurize(modelInputDomain(new URL(u).hostname), BUCKETS)));
    evalReport[path.basename(f)] = {
      phishingCount: ps.length,
      detectedAt0_75: ps.filter(p => p >= 0.75).length,
      detectedAt0_9: ps.filter(p => p >= 0.9).length,
    };
  }
  console.log('\nTập đánh giá (chưa từng huấn luyện):', JSON.stringify(evalReport, null, 2));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const buf = serializeModel(m, {
    trainedAt: new Date().toISOString().slice(0, 10),
    sources: ['Phishing.Database phishing-domains-ACTIVE (nhãn 1)', 'Tranco top-1m hạng 20k-1M (nhãn 0)'],
    trainSamples: train.length,
    epochs: EPOCHS,
    validation,
  });
  fs.writeFileSync(OUT, buf);
  console.log(`\nĐã lưu mô hình: ${OUT} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main();
