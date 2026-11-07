/**
 * Đánh giá mô hình nội dung trên TRANG WEB THẬT (dữ liệu mô hình chưa từng thấy).
 * Nội dung trang được tải một lần và lưu đệm ở .cache/eval-pages.json (chỉ đọc HTML, không chạy JavaScript).
 *
 *   npx tsx scripts/eval-content-model.ts --tune-phishing snapshot.txt --test-phishing holdout.txt [--concurrency 8]
 *
 * Hai nửa tách biệt: "tune" (eval-dataset.json + --tune-phishing) dùng để phân tích lỗi khi cải tiến bộ sinh dữ liệu;
 * "test" (eval-holdout*.json + --test-phishing) chỉ dùng để báo cáo số đo cuối, không xem lỗi của nó.
 */
import fs from 'node:fs';
import path from 'node:path';
import { collectEvidence } from '../server/evidence.ts';
import { predictContentRisk } from '../server/contentModel.ts';
import { auc, metricsAt } from '../server/hashedMlp.ts';

const args = process.argv.slice(2);
const argList = (name: string) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));
const CONCURRENCY = parseInt(argList('concurrency')[0] || '8', 10);
const CACHE_FILE = path.resolve('.cache/eval-pages.json');

type Split = 'tune' | 'test';
const samples: Array<{ url: string; label: 0 | 1; group: string; split: Split }> = [];
for (const [f, split] of [['eval-dataset.json', 'tune'], ['eval-holdout.json', 'test'], ['eval-holdout2.json', 'test']] as const) {
  const p = path.join(import.meta.dirname, f);
  if (!fs.existsSync(p)) continue;
  const ds = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const u of ds.safe || []) samples.push({ url: u, label: 0, group: 'legit', split });
  for (const u of ds.dangerous || []) samples.push({ url: u, label: 1, group: 'gambling', split });
}
for (const [flag, split] of [['tune-phishing', 'tune'], ['test-phishing', 'test']] as const) {
  for (const f of argList(flag)) {
    for (const u of fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(l => /^https?:\/\//.test(l))) {
      samples.push({ url: u, label: 1, group: 'phishing', split });
    }
  }
}
const unique = [...new Map(samples.map(s => [s.url, s])).values()];

const cache: Record<string, any> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const missing = unique.filter(s => !(s.url in cache));
console.log(`${unique.length} trang (${missing.length} cần tải mới)...`);
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < missing.length) {
    const s = missing[next++];
    try {
      const target = /^https?:\/\//.test(s.url) ? s.url : `https://${s.url}`;
      const e = await collectEvidence(target);
      cache[s.url] = { status: e.http.status, html: e.html };
    } catch (err: any) {
      cache[s.url] = { error: err?.message || String(err) };
    }
    process.stdout.write('.');
  }
}));
fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
console.log('');

// Chỉ đánh giá trang tải được nội dung thật (bỏ trang đã bị gỡ, lỗi 4xx/5xx, chặn bot, gần như rỗng)
const usable = unique.filter(s => {
  const c = cache[s.url];
  const totalLen = (c?.html?.textLength || 0) + (c?.html?.description?.length || 0) + (c?.html?.title?.length || 0);
  return c?.html && c.status && c.status < 400 && !c.html.botChallenge && totalLen >= 30;
});
const scored = usable.map(s => ({ ...s, p: predictContentRisk(cache[s.url].html) }));
if (scored.some(s => s.p === null)) {
  console.log('Chưa có mô hình nội dung (server/models/phishing-content-model.bin.gz).');
  process.exit(0);
}
const report = (split: Split, showErrors: boolean) => {
  const xs = scored.filter(s => s.split === split);
  const scores = xs.map(s => s.p as number);
  const labels = xs.map(s => s.label);
  console.log(`\n===== Nửa "${split}": ${xs.length} trang (hợp pháp ${labels.filter(l => l === 0).length}, nguy hiểm ${labels.filter(l => l === 1).length}) =====`);
  console.log(`AUC: ${auc(scores, labels).toFixed(4)}`);
  for (const t of [0.5, 0.75, 0.9]) console.log(' ', JSON.stringify(metricsAt(scores, labels, t)));
  for (const g of ['legit', 'gambling', 'phishing']) {
    const gs = xs.filter(s => s.group === g);
    console.log(`  ${g.padEnd(9)} n=${gs.length}  p>=0.5: ${gs.filter(s => (s.p as number) >= 0.5).length}  p>=0.9: ${gs.filter(s => (s.p as number) >= 0.9).length}`);
  }
  if (!showErrors) return;
  console.log('Trang hợp pháp bị chấm rủi ro cao nhất:');
  for (const s of xs.filter(s => s.label === 0).sort((a, b) => (b.p as number) - (a.p as number)).slice(0, 8)) {
    console.log(`  ${(s.p as number).toFixed(3)} ${s.url} | "${cache[s.url].html.title.slice(0, 60)}"`);
  }
  console.log('Trang nguy hiểm bị chấm rủi ro thấp nhất:');
  for (const s of xs.filter(s => s.label === 1).sort((a, b) => (a.p as number) - (b.p as number)).slice(0, 10)) {
    console.log(`  ${(s.p as number).toFixed(3)} ${s.url.slice(0, 60)} | "${cache[s.url].html.title.slice(0, 50)}" | ${cache[s.url].html.text.slice(0, 80)}`);
  }
};
report('tune', true);
report('test', false);
