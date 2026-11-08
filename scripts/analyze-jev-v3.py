import json, sys
rows = [r for r in json.load(open(sys.argv[1])) if r.get('jev') and 'probabilities' in r['jev']['raw']['risk_vector']]
print('web có câu trả lời engine:', len(rows))
P = lambda r, k: r['jev']['raw']['risk_vector']['probabilities'].get(k, 0)

def auc(pos, neg):
    return sum((a > b) + 0.5 * (a == b) for a in pos for b in neg) / (len(pos) * len(neg))

def grp(g): return [r for r in rows if r['group'] == g]
leg, gam, phi = grp('legit'), grp('gambling'), grp('phishing')
for name, f in [('fraud', lambda r: P(r, 'fraud')), ('fraud+spam', lambda r: P(r, 'fraud') + P(r, 'spam')), ('Verity 100-điểm', lambda r: 100 - r['score'])]:
    print(f'AUC {name:16s} nguy hiểm/hợp pháp {auc([f(r) for r in gam + phi], [f(r) for r in leg]):.1%} | phishing/hợp pháp {auc([f(r) for r in phi], [f(r) for r in leg]):.1%} | cờ bạc/hợp pháp {auc([f(r) for r in gam], [f(r) for r in leg]):.1%}')
for g, rs in [('legit', leg), ('gambling', gam), ('phishing', phi)]:
    from collections import Counter
    print(f'  {g:9s} n={len(rs):3d}  fraud TB {sum(P(r,"fraud") for r in rs)/len(rs):.2f}  spam TB {sum(P(r,"spam") for r in rs)/len(rs):.2f}  choice {dict(Counter(r["jev"]["raw"]["risk_vector"]["choice"] for r in rs))}')

y = [r['label'] == 'dangerous' for r in rows]
def report(name, pred):
    tp = sum(a and b for a, b in zip(pred, y)); fp = sum(a and not b for a, b in zip(pred, y))
    fn = sum(not a and b for a, b in zip(pred, y)); tn = sum(not a and not b for a, b in zip(pred, y))
    prec = tp / (tp + fp) if tp + fp else 0; rec = tp / (tp + fn); f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    print(f'{name:46s} acc {(tp+tn)/len(y):.1%} prec {prec:.1%} rec {rec:.1%} F1 {f1:.1%} FPR {fp/(fp+tn):.1%}  (TP {tp} FP {fp} TN {tn} FN {fn})')

for t in (0.5, 0.7, 0.9):
    report(f'Engine: fraud >= {t}', [P(r, 'fraud') >= t for r in rows])
report('Engine: fraud+spam >= 0.5 (bản đang chạy)', [P(r, 'fraud') + P(r, 'spam') >= .5 for r in rows])
report('Verity (điểm < 50)', [r['score'] < 50 for r in rows])

def combined(r, key):
    """Giả lập applyJevDecision ở vùng xám 45-74 với xác suất rủi ro = key(r)."""
    s = r['score']
    if not 45 <= s <= 74: return s
    risk = key(r)
    if risk >= 0.8: return min(s, 15)
    if P(r, 'legitimate') >= 0.85 and risk < 0.5: return min(95, s + 15)
    return s
for name, key in [('fraud', lambda r: P(r, 'fraud')), ('fraud+spam', lambda r: P(r, 'fraud') + P(r, 'spam'))]:
    report(f'Verity + engine ({name}) ở vùng xám', [combined(r, key) < 50 for r in rows])
gz = [r for r in rows if 45 <= r['score'] <= 74]
print('ca vùng xám:', len(gz), '- trong đó nguy hiểm:', sum(r['label'] == 'dangerous' for r in gz))
for r in sorted(gz, key=lambda r: -P(r, 'fraud'))[:25]:
    print(f"   {r['label']:9s} {r['group']:8s} {r['score']:3d}  fraud {P(r,'fraud'):.2f} spam {P(r,'spam'):.2f} legit {P(r,'legitimate'):.2f}  {r['url'][:60]}")
