/**
 * Tính bộ chỉ số chuẩn từ file kết quả của scripts/eval-accuracy.ts (--out).
 *
 *   npx tsx scripts/eval-metrics.ts eval/results/set-a.json [eval/results/set-b.json ...]
 *
 * Nhiều file sẽ được gộp lại thành một tập. Dương tính = website nguy hiểm (lừa đảo/cờ bạc);
 * hệ thống kết luận "nguy hiểm" khi điểm < 50 (ngưỡng thứ hai: < 75, tức không được xếp "An toàn").
 * Khoảng tin cậy 95% tính bằng bootstrap 2.000 lần lấy mẫu lại.
 */
import fs from 'node:fs';

interface Row { url: string; label: 'safe' | 'dangerous'; group: string; score: number | null }

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Cách dùng: npx tsx scripts/eval-metrics.ts <kết-quả.json> [...]');
  process.exit(1);
}
const rows: Row[] = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8'))).filter((r: Row) => typeof r.score === 'number');

function metrics(sample: Row[], threshold: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of sample) {
    const actual = r.label !== 'safe';
    const predicted = r.score! < threshold;
    if (actual && predicted) tp++;
    else if (actual) fn++;
    else if (predicted) fp++;
    else tn++;
  }
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  // AUC = xác suất một trang nguy hiểm bị chấm rủi ro cao hơn một trang hợp pháp (Mann-Whitney, hoà tính 0,5)
  const pos = sample.filter(r => r.label !== 'safe').map(r => 100 - r.score!);
  const neg = sample.filter(r => r.label === 'safe').map(r => 100 - r.score!);
  let wins = 0;
  for (const a of pos) for (const b of neg) wins += a > b ? 1 : a === b ? 0.5 : 0;
  return {
    tp, fp, tn, fn,
    accuracy: (tp + tn) / sample.length,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall),
    auc: wins / (pos.length * neg.length),
    fpr: fp / (fp + tn),
    specificity: tn / (fp + tn),
    mcc: (tp * tn - fp * fn) / Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)),
  };
}

const KEYS = ['accuracy', 'precision', 'recall', 'f1', 'auc', 'fpr', 'specificity', 'mcc'] as const;
const NAMES: Record<(typeof KEYS)[number], string> = {
  accuracy: 'Accuracy', precision: 'Precision', recall: 'Recall (TPR)', f1: 'F1-Score',
  auc: 'AUC-ROC', fpr: 'FPR (báo nhầm)', specificity: 'Specificity', mcc: 'MCC',
};
const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : '-');

const groups = [...new Set(rows.map(r => r.group))];
console.log(`Tập đo: ${rows.length} mẫu (${groups.map(g => `${g} ${rows.filter(r => r.group === g).length}`).join(', ')})`);

for (const threshold of [50, 75]) {
  const base = metrics(rows, threshold);
  const boot: Record<string, number[]> = {};
  for (let k = 0; k < 2000; k++) {
    const sample = rows.map(() => rows[Math.floor(Math.random() * rows.length)]);
    const m = metrics(sample, threshold);
    for (const key of KEYS) (boot[key] ??= []).push(m[key]);
  }
  const ci = (key: string) => {
    const a = boot[key].filter(Number.isFinite).sort((x, y) => x - y);
    return `[${pct(a[Math.floor(a.length * 0.025)])} – ${pct(a[Math.floor(a.length * 0.975)])}]`;
  };
  console.log(`\nNgưỡng "nguy hiểm" = điểm < ${threshold}${threshold === 75 ? ' (tính cả "Cảnh báo")' : ''}`);
  console.log(`  TP=${base.tp}  FP=${base.fp}  TN=${base.tn}  FN=${base.fn}`);
  for (const key of KEYS) console.log(`  ${NAMES[key].padEnd(15)} ${pct(base[key]).padStart(8)}  ${ci(key)}`);
}
