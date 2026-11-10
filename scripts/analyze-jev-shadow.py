import json, sys
rows = [r for r in json.load(open(sys.argv[1])) if r.get('jev')]
print("có kết quả engine:", len(rows))
y = [1 if r['label'] == 'dangerous' else 0 for r in rows]
p = [r['jev']['raw']['is_phishing']['probability'] for r in rows]
ch = [r['jev']['raw']['risk_vector']['choice'] for r in rows]

def auc(y, s):
    pos = [v for v, t in zip(s, y) if t]; neg = [v for v, t in zip(s, y) if not t]
    return sum((a > b) + 0.5 * (a == b) for a in pos for b in neg) / (len(pos) * len(neg))

def report(name, pred):
    tp = sum(1 for a, b in zip(pred, y) if a and b); fp = sum(1 for a, b in zip(pred, y) if a and not b)
    fn = sum(1 for a, b in zip(pred, y) if not a and b); tn = sum(1 for a, b in zip(pred, y) if not a and not b)
    acc = (tp + tn) / len(y); prec = tp / (tp + fp) if tp + fp else 0; rec = tp / (tp + fn); fpr = fp / (fp + tn)
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    print(f'{name:42s} acc {acc:.2%} prec {prec:.2%} rec {rec:.2%} F1 {f1:.2%} FPR {fpr:.2%}  (TP {tp} FP {fp} TN {tn} FN {fn})')

print(f'AUC engine (is_phishing): {auc(y, p):.2%}')
print(f'AUC Verity (100-score):  {auc(y, [100 - r["score"] for r in rows]):.2%}')
from collections import Counter
for g in ['legit', 'gambling', 'phishing']:
    sub = [(pp, c) for r, pp, c in zip(rows, p, ch) if r['group'] == g]
    print(f'  {g:9s} n={len(sub):3d} p_phish TB {sum(a for a,_ in sub)/len(sub):.2f}  choice {dict(Counter(c for _,c in sub))}')
report('Engine: p>0.60 hoặc choice!=clean (khuyến nghị)', [a > 0.6 or c != 'clean' for a, c in zip(p, ch)])
report('Engine: p>0.60', [a > 0.6 for a in p])
report('Verity hiện tại (điểm < 50)', [r['score'] < 50 for r in rows])

# Giả lập bật engine thật ở vùng xám 45-74 theo đúng applyJevDecision
def combined(r):
    s = r['score']; j = r['jev']
    if not (45 <= s <= 74): return s
    if (j['isCredentialHarvesting'] and j['isCredentialHarvestingConfidence'] >= .8) or (j['isFinancialOrGamblingScam'] and j['isFinancialOrGamblingScamConfidence'] >= .8) or (j['isBrandImpersonation'] and j['isBrandImpersonationConfidence'] >= .8):
        return min(s, 15)
    if j['verdict'] == 'safe' and j['verdictProbabilities'].get('safe', 0) >= .85: return min(95, s + 15)
    return s
report('Verity + engine ở vùng xám (giả lập)', [combined(r) < 50 for r in rows])
gz = [r for r in rows if 45 <= r['score'] <= 74]
print('số ca vùng xám:', len(gz), '| bị engine kéo xuống 15:', sum(1 for r in gz if combined(r) == min(r['score'], 15)), '| trong đó web hợp pháp:', sum(1 for r in gz if combined(r) == min(r['score'], 15) and r['label'] == 'safe'))
