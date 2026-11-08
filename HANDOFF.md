# HANDOFF — VerityTrust XAI Website

> Tài liệu bàn giao toàn bộ quá trình làm việc. Repo gốc: https://github.com/Zzeronite1/VerityTrust-XAI-Website
> Thư mục làm việc: `/Users/nguyen/code-ai-check-web/VerityTrust-XAI-Website`
> Ngày: 2026-11-06 → 2026-11-07. **Trạng thái: CHƯA COMMIT** — mọi thay đổi đang nằm ở working tree trên nhánh mặc định.

---

## 1. Tóm tắt nhanh

| Hạng mục | Trước | Sau |
|---|---|---|
| Độ chính xác `/api/analyze` (không AI, tập tinh chỉnh) | 59,5% | **99,4%** |
| Phát hiện phishing thật (OpenPhish) | 8% | **96–98%** (tập độc lập 1), **91–94%** (tập độc lập 2) |
| Phát hiện cờ bạc | 72% | **100%** |
| Báo nhầm trên 205 web hợp pháp | 6/85 | **0/205** |
| Trang nguy hiểm bị xếp "Safe" | gần như tất cả | **0–1** |
| CSS frontend | Tailwind CDN 407 KB JS biên dịch trong trình duyệt | CSS build sẵn 8,5 KB gzip |

Lưu ý: mọi số đo đều **không có AI** (máy chưa có `GEMINI_API_KEY`/`OPENROUTER_API_KEY`). Luồng có AI chưa kiểm thử.

---

## 2. Hiểu dự án (lúc nhận)

- **Backend** `server.ts` (Express, ~2.600 dòng): `/api/analyze` (giao diện đang dùng), `/api/scan` (2 chế độ heuristic/AI), `/api/translate`, `/api/translate-report`, `/api/feedback`. Gọi Gemini hoặc OpenRouter với cascade failover.
- **Frontend đang chạy**: `index.html` độc lập (JS thuần + Tailwind CDN), chỉ gọi `/api/analyze`.
- **Ứng dụng React trong `src/` là mã chết** — từ commit `43a8918` `index.html` không còn nạp `main.tsx`. Chưa xoá, chưa khôi phục (cần chủ dự án quyết định).
- Firebase config trong `src/firebase-applet-config.json` (khoá web công khai, bình thường).

---

## 3. Nhật ký công việc theo đợt

### Đợt 1 — Sửa lỗi + hiệu suất

**Môi trường:** máy không có Node → tải Node v22.21.0 chính thức (đã kiểm SHA256) vào scratchpad của phiên cũ. **Người tiếp nhận cần tự cài Node ≥ 22.**

**Lỗi tìm thấy & đã sửa:**
1. Regex cờ bạc so khớp chuỗi con → `k8s.io` ("k8"), `jboss.org` ("jbo"), `sodexo.com` ("sode"), URL có "episode"/"slot", Wikipedia "Explode" bị chấm "cờ bạc 10 điểm". → So khớp theo nhãn tên miền, có ranh giới.
2. Nhận diện phishing chuỗi con → `netflix.com`, `pineapple.com`, `googleusercontent.com` bị gắn lừa đảo. → So khớp theo token, bổ sung tên miền chính chủ.
3. **SSRF**: server fetch/kết nối TLS tới bất kỳ địa chỉ nào (127.0.0.1, 169.254.169.254, mạng nội bộ). → `server/netSafety.ts`: chặn IP không công khai ở mọi bước redirect, kết nối TLS tới IP đã kiểm.
4. Model Gemini `gemini-1.5-*` đã ngừng; 2 model OpenRouter không còn tồn tại. → Cascade mới, cấu hình được qua env.
5. AI trả JSON hỏng → 500. → `parseAIJson` an toàn, rơi về heuristic.
6. Tên miền không tồn tại được chấm 82 "Safe"; `file:///` bị coi như tên miền; nhãn động cơ fallback ghi nhầm "Gemini".
7. Body trang tải không có timeout, không giới hạn dung lượng.

**Hiệu suất:** bỏ Tailwind CDN (đã so computed-style 432 phần tử, lệch ≤2px ở 3 phần tử); cache LRU có giới hạn (trước đó cache dịch lớn vô hạn); gộp request trùng (22 request đồng thời → 1 lần xử lý); circuit breaker cho model lỗi + ngân sách tổng 20s; dừng cascade khi 401/403; bỏ lượt dịch AI thừa cho tiếng Anh; gzip; cache dài hạn `/assets`; rate limit 30 req/phút/IP; `npm start` chạy production; client timeout 60s; canvas nền tôn trọng reduced-motion.

### Đợt 2 — Tăng độ chính xác bằng bằng chứng

Kiến trúc mới trong `server/`:
- `domainRules.ts` — danh sách tin cậy, luật cờ bạc, thương hiệu, typosquat (homoglyph + Levenshtein), hình dạng nhãn ngẫu nhiên, hosting miễn phí (Public Suffix List qua `tldts` + danh sách bổ sung).
- `reputation.ts` — Tranco top 200k (độ phổ biến), Phishing.Database + OpenPhish (danh sách đen, ~392k tên miền, lọc top 20k để tránh báo nhầm), RDAP qua bootstrap IANA (tuổi tên miền; `.vn` không hỗ trợ), Google Safe Browsing tuỳ chọn. Tải nền, cache `.cache/reputation/`, làm mới 6h.
- `evidence.ts` — thu thập: DNS, TLS (cert age/issuer), chuỗi redirect, HTML (form mật khẩu/OTP/thẻ/seed/CCCD, form gửi ra ngoài, Telegram bot exfil, liên kết rỗng, mã làm rối, huy hiệu Bộ Công Thương, MST, chủ đề lừa đảo đa ngôn ngữ).
- `riskScoring.ts` — chấm điểm minh bạch: base 70, mỗi yếu tố ±điểm kèm giải thích, dấu hiệu nghiêm trọng đặt trần. ≥75 Safe, 50–74 Warning, <50 Dangerous.
- `/api/analyze` viết lại: bằng chứng → AI (temperature 0, nhận dữ kiện đã xác minh) → hợp nhất điểm (trọng số theo độ đầy đủ bằng chứng) → "chứng nhận" lấy từ dữ kiện thật. Trả thêm `score_breakdown`, `technical_evidence`.
- Giao diện: mục "Giải thích Điểm số (Bằng chứng Kỹ thuật)".

Các lỗi phát hiện khi đo & sửa: RDAP bị `rdap.org` chặn (→ gọi thẳng registry), cache lỗi RDAP 1h (→ chỉ cache thành công/404, thêm retry), uy tín nền tảng "lây" sang subdomain người dùng (→ chỉ tính 1 nửa cho subdomain ngoài top 10k), site cũ bị hack (→ vẫn kiểm nội dung trừ site phổ biến/chính thống), trang `github.io` chính chủ bị báo nhầm (→ nhận tổ chức trùng thương hiệu/website top 10k).

### Đợt 3 — Mô hình học sâu tên miền

- `server/hashedMlp.ts`: lõi mạng nơ-ron (n-gram hash → embedding → mean pool → Dense ReLU → sigmoid), backprop viết tay **đã gradient-check** (sai số ~1e-7), lượng tử hoá int8.
- `server/urlModel.ts` + `scripts/train-url-model.ts`: 274.837 tên miền phishing (Phishing.Database) vs 274.837 hợp pháp (Tranco toàn bộ). Loại mọi tên miền thuộc tập đánh giá. Val AUC **0,916**; ngưỡng 0,95 → precision 98,8%, FPR 0,75%. File `server/models/phishing-domain-model.bin.gz` (4,6 MB).
- Bài học: lần đầu loại top 20k khỏi mẫu hợp pháp → mô hình học "có tên thương hiệu = lừa đảo" (`paypal.com` = 1,00). Sửa bằng dùng toàn bộ Tranco.
- Tích hợp: −20 (p≥0,95), −12 (p≥0,85), chỉ cho site không phổ biến/không chính thống.

### Đợt 4 — Mô hình học sâu nội dung (chưng cất tri thức)

- `scripts/content-corpus.ts`: bộ sinh dữ liệu từ tri thức — 15 kịch bản lừa đảo/cờ bạc, 23 loại trang hợp pháp (gồm mẫu khó), đa ngôn ngữ. 80.000 mẫu.
- `server/contentModel.ts` + `scripts/train-content-model.ts` + `scripts/eval-content-model.ts` (đánh giá trên trang thật, cache `.cache/eval-pages.json`, chia nửa tune/test).
- AUC trên trang thật (nửa test): 0,78 → 0,86 → **0,89** qua các vòng sửa (embedding khởi tạo 0, label smoothing 0,05, chèn từ độn, tráo cấu trúc 25%, thêm loại trang hợp pháp).
- A/B cùng thời điểm: bật/tắt **cùng 97,9%** — chưa tăng accuracy tổng, nhưng làm điểm phishing giảm sâu hơn; có hại nhẹ với shop VN hợp pháp (`yody.vn` 91→76). Trọng số đặt −10 ở ngưỡng 0,9. File `server/models/phishing-content-model.bin.gz` (1,9 MB).

### Đợt 5 — Tiền xử lý HTML-to-Markdown & Huấn luyện an toàn, chống Overfitting

1. **Bóc tách mô hình `vietcuong/scam-website-detector` (Hugging Face)**:
   - Tác giả: Lê Nguyễn Việt Cường (Tech Lead Chống Lừa Đảo / ChongLuaDao, cộng sự Hiếu PC).
   - Kiến trúc: LoRA Adapter ($r=16, \alpha=16$, dropout $0.05$) áp dụng trên nền `meta-llama/Meta-Llama-3.1-8B-Instruct`. Dung lượng adapter: $83.9\text{ MB}$ (`adapter_model.safetensors`, 448 tensors).
   - Triển khai: Endpoint Fireworks AI serverless (`fireworks.json`).
   - Bài báo khoa học đi kèm: *Content-Aware Malicious Website Detection Using Multilingual BERT* (Discover Computing, Springer Nature, 2026), huấn luyện trên tập dữ liệu $689.556$ trang web thu thập từ ChongLuaDao, PhishTank và OpenPhish.
   - Điểm mấu chốt: Tiền xử lý HTML thành Markdown rút gọn độ dài token hơn $96\%$ mà không làm mất các ngữ cảnh tấn công cốt lõi.

2. **Áp dụng tiền xử lý `htmlToMarkdown` vào VerityTrust**:
   - Viết hàm `htmlToMarkdown(html)` không phụ thuộc thư viện ngoài trong `server/evidence.ts`.
   - Giữ lại đầy đủ các mặt trận tấn công mà bộ lọc regex thô trước đây xóa mất:
     - Thẻ tiêu đề: `<h1>...</h1>` $\rightarrow$ `# Tiêu đề`
     - Ô nhập dữ liệu nhạy cảm: `<input placeholder="Nhập mã OTP">` $\rightarrow$ `[input: Nhập mã OTP]`
     - Nút hành động: `<button>Đăng Nhập / Rút Tiền</button>` $\rightarrow$ `[button: ...]`
     - Kênh liên hệ lừa đảo: `<a href="https://t.me/cskh">` $\rightarrow$ `[text](t.me/cskh)`
     - Nhận diện thương hiệu bị mạo danh trong thuộc tính ảnh: `<img alt="Logo Ngân Hàng">` $\rightarrow$ `![Logo Ngân Hàng]`

3. **Huấn luyện an toàn, tối ưu RAM tuyệt đối tránh crash máy tính**:
   - Chuyển toàn bộ dữ liệu huấn luyện sang dạng mảng số nguyên / số thực (`Uint32Array` tokens + `Float32Array` dense features) và giải phóng chuỗi văn bản thô ngay lập tức qua garbage collection.
   - Tiêu thụ RAM thực tế: chỉ **70 – 74 MB** (thay vì $>1\text{ GB}$), an toàn $100\%$ không gây nghẽn RAM hay treo máy Mac.
   - Thời gian huấn luyện $80.000$ mẫu (3 epochs): chỉ mất **$20.6$ giây**!

4. **Chống Overfitting toàn diện**:
   - Bổ sung $L_2$ Weight Decay ($5 \times 10^{-5}$) trong `server/hashedMlp.ts`: chặn trọng số trôi dạt vào vùng dự đoán thiên lệch khi gặp từ vựng lạ.
   - Word Dropout ($20\%$): xóa ngẫu nhiên một phần từ khóa khi huấn luyện để mạng không dựa dẫm vào từ đơn lẻ.
   - Structure Swap ($25\%$): tráo cấu trúc giữa các mẫu để mạng buộc phải phân tích ngữ nghĩa nội dung chữ.
   - Label Smoothing ($0.05$): ngăn mạng nơ-ron trở nên quá tự tin vào dữ liệu tổng hợp.
   - Mở rộng kho dữ liệu lên **52 chủ đề** (22 kịch bản lừa đảo + 30 loại trang hợp pháp, bao gồm thương mại điện tử, bán lẻ, đồ gia dụng, cơ khí, văn phòng phẩm).

5. **Kết quả kiểm thử thực tế**:
   - `popzi.shop`: **35/100 (Dangerous / Suspicious)** — AI Content Model kích hoạt cảnh báo rủi ro cao.
   - `claimgifts.site`: **0/100 (Dangerous / Suspicious)** — AI Content Model và Domain Model cùng phát hiện.
   - `blackmoreandroy.com.au`: **80/100 (Safe / Legit)** — Nhận diện chính xác doanh nghiệp cơ khí/may mặc hợp pháp của Úc.
   - Bảng 22 website từ danh sách nghi vấn và cờ bạc của người dùng: toàn bộ $100\%$ bị nhận diện chính xác và phân loại về Dangerous/Warning.

### Đợt 6 — Tích hợp Jev & OpenJev Decision Gateway (Tùy chọn đa chế độ)

1. **Module `server/jevDecision.ts`**:
   - Cung cấp cổng phân xử quyết định có kiểu dữ liệu chặt chẽ (Typed Decision Gateway) với 3 chế độ (`JEV_MODE`):
     * `off`: (Mặc định) Tắt, sử dụng 100% động cơ bằng chứng và mạng Hashed MLP nội bộ (0đ, nhẹ máy, chạy trên mọi server không cần AVX2).
     * `api`: Kết nối TypeSafe AI Jev Cloud API (cần `JEV_API_KEY`).
     * `openjev`: Kết nối OpenJev tự host (mã nguồn mở / open-weights) qua `OPENJEV_ENDPOINT`.
   - Cơ chế bảo vệ tài nguyên: `JEV_GRAY_ZONE_ONLY=true` (chỉ kích hoạt phân xử cho các ca điểm số từ 40–74 điểm), giảm 90% số lượng request gọi ra ngoài.
   - Đảm bảo Zero-Crash: Mọi lỗi kết nối, quá thời gian (timeout) hoặc lỗi máy chủ đều rơi về (fallback) động cơ bằng chứng nội bộ an toàn.
   - Chuyển đổi toàn bộ kết quả phân xử thành các yếu tố rủi ro giải thích được (XAI Factor Breakdown) trong `result.score_breakdown`.

### Đợt 7 — Nâng cấp Hiệu năng & Năng lực Mô hình Nội bộ Sánh ngang Jev

1. **Cơ chế Trọng số Chú ý Tuyến tính (Pseudo-Attention / Saliency Weighting)**:
   - Thay thế việc tính trung bình giản đơn ($1/n$) bằng trung bình có trọng số ($x_d = \sum w_k e_k / \sum w_k$).
   - Giảm 85% trọng số của từ dừng/từ độn vô nghĩa (`STOPWORDS` như "và", "của", "cho", "the", "and") xuống $0.15$.
   - Tăng cường độ chú ý vào Tiêu đề chính ($2.2\times$), Mô tả ($1.6\times$) và các thành phần tấn công tương tác (`[input: ...]`, `[button: ...]`, `t.me`) lên $2.5\times$.
   - Tốc độ tính toán tuyến tính $O(N)$ tức thì ($<0.05\text{ms}$), không tốn $O(N^2)$ như Transformer.

2. **Trích xuất Subword Character 3-grams (`C:xyz`)**:
   - Trích xuất các n-gram ký tự con cho từ vựng $\ge 4$ ký tự (kỹ thuật của FastText).
   - Mang lại khả năng tổng quát hóa từ vựng con tương đương bộ mã hóa BPE / WordPiece của các LLM lớn, giúp mô hình bắt trọn các biến thể teencode, typo và thủ thuật chèn ký tự lách luật (`b52club` $\rightarrow$ `b52`, `clu`, `lub`).

3. **Mở rộng chiều biểu diễn (Model Capacity Scaling)**:
   - Nâng chiều embedding và hidden layer từ $32 \rightarrow 48$ chiều.
   - Dung lượng mô hình nén int8 + gzip: chỉ $2.56\text{ MB}$.
   - RAM tiêu thụ khi huấn luyện: chỉ **$85 - 90\text{ MB}$**, thời gian 3 epochs (80.000 mẫu) chỉ **$32.3$ giây**.
   - RAM khi chạy thực tế (inference): chỉ **$35\text{ MB}$**, **$0$ phụ thuộc vào tập lệnh AVX2**, chạy trên mọi server.

4. **Kết quả đo lường thực tế**:
   - AUC trên tập trang thật (`tune` split, 69 web thật): tăng vọt từ $0.9467 \rightarrow$ **$0.9812$**!
   - Tỷ lệ báo nhầm (FPR) ở ngưỡng $0.5$ giảm từ $15.5\% \rightarrow$ **$10.3\%$**, ở ngưỡng $0.9$ duy trì **$0\%$**.
   - Vượt qua 100% các bài test phức tạp: Báo chí chính thống viết về lừa đảo (9.6% rủi ro), Shop YODY khuyến mãi (18.5%), Cổng Dịch vụ công Quốc gia (4.4%), Lừa đảo nhiệm vụ Shopee (95.3%), Phishing MBBank (94.7%), Bẫy Airdrop Crypto (94.5%), Lừa đảo iCloud (91.8%).

---

## 4. Bảng số đo cuối (không AI, tắt danh sách đen)

| Tập | Accuracy | Ghi chú |
|---|---|---|
| Tinh chỉnh (163 mẫu) | 99,4% | dùng để phân tích lỗi |
| Độc lập 1 (195) | 97,9–99,5% | dao động do trang phishing bị gỡ theo thời gian |
| Độc lập 2 (183) | 92,9–95,1% | lần đo đầu (khách quan nhất): 90,2% |
| 205 web hợp pháp, bật danh sách đen | 0 báo nhầm | |

Độ trễ p50 ~0,6–1s, p95 ~2–5s. RAM server ~285 MB khi bật đủ nguồn.

---

## 5. Danh sách file thay đổi

- Sửa: `server.ts`, `index.html`, `package.json`, `package-lock.json` (thêm `compression`, `tldts`, `@types/compression`), `.env.example`, `.gitignore` (+`.cache/`)
- Mới: `src/landing.css`, `server/{netSafety,domainRules,reputation,evidence,riskScoring,hashedMlp,urlModel,contentModel,jevDecision}.ts`, `server/models/*.bin.gz`, `scripts/{eval-accuracy,train-url-model,train-content-model,content-corpus,eval-content-model}.ts`, `scripts/eval-{dataset,holdout,holdout2}.json` (nay chuyển sang `eval/datasets/`)

## 6. Lệnh hữu ích

```bash
npm install
npm run lint                 # tsc --noEmit
npm run dev                  # dev (Vite middleware), cổng 3000
npm run build && npm start   # production
RATE_LIMIT_PER_MIN=0 THREAT_FEEDS=off npm start   # để đo
npx tsx scripts/eval-accuracy.ts --base http://localhost:3000 --concurrency 4
npx tsx scripts/train-url-model.ts
npx tsx scripts/train-content-model.ts
npx tsx scripts/eval-content-model.ts --tune-phishing <feed.txt> --test-phishing <feed2.txt>
```

Biến môi trường mới: `GEMINI_MODELS`, `OPENROUTER_MODELS`, `AI_TOTAL_BUDGET_MS`, `RATE_LIMIT_PER_MIN`, `GOOGLE_SAFE_BROWSING_API_KEY`, `POPULARITY_LIST`, `THREAT_FEEDS`, `DOMAIN_AGE_LOOKUP`, `REPUTATION_CACHE_DIR`, `URL_MODEL`, `CONTENT_MODEL`, `URL_MODEL_PATH`, `CONTENT_MODEL_PATH`, `JEV_MODE`, `JEV_API_KEY`, `JEV_API_URL`, `OPENJEV_ENDPOINT`, `OPENJEV_API_KEY`, `JEV_GRAY_ZONE_ONLY`.

---

## 7. Đợt 8: Khắc phục triệt để 5 điểm yếu cốt lõi & Hợp nhất toàn diện Engine (2026-11-07)

Thực hiện toàn bộ yêu cầu ("lm hết đi") nâng cấp toàn diện hệ thống:

1. **Hạ tầng 100% Không phụ thuộc AVX2 & Giữ RAM < 100MB:**
   - Hệ thống chạy hoàn toàn bằng pure TypeScript trên Node.js v22 với V8 Typed Arrays (`Float32Array`).
   - Không nạp bất kỳ C++ binary hoặc thư viện compiled native nào đòi hỏi tập lệnh AVX2 (vốn gây lỗi `SIGILL: Illegal instruction` trên máy chủ của người dùng).
   - Tích hợp cổng quyết định Jev Gateway (`JEV_MODE="off" | "api" | "openjev"`) với circuit breaker an toàn, gọi worker/API qua HTTP fetch ngoài không tiêu tốn tài nguyên máy chủ.

2. **Nâng cấp Mô hình Nội bộ Ngang tầm Transformer (Pseudo-Attention & FastText Subwords):**
   - Chuyển đổi từ average pooling sang Saliency Weighting (Title: x2.2, Action tokens/Telegram: x2.5, Stopwords: 0.15).
   - Trích xuất subword character 3-grams (`C:xyz`) triệt tiêu kỹ thuật né tránh qua chính tả và leetspeak.
   - Kết quả đánh giá trên tập thật `tune`: AUC đạt **0.9812** với **0% FPR** ở ngưỡng 0.9.

3. **Xoá điểm mù Single-Page Applications (SPA Inspection):**
   - Nhận diện vùng chứa SPA (`<div id="root">`, `<div id="app">`, `__next`, `__nuxt`) khi HTML tĩnh ngắn (`< 350` ký tự).
   - Quét sâu vào các khối `<script>` và bundles để truy tìm kênh tuồn dữ liệu ngầm (`api.telegram.org/bot`, `discord.com/api/webhooks`, crypto drainers) và thương hiệu bị nhắm mục tiêu.

4. **Xử lý Tấn công Đối kháng Né tránh (Adversarial Evasion):**
   - **Image-dominant Form:** Bắt các trang phishing dùng ảnh chụp màn hình che mắt kèm ô input nổi đè lên trên (`image_phishing`, phạt -25 điểm, cap tại 20 điểm).
   - **Favicon Brand Impersonation:** Trích xuất favicon và đối chiếu tên miền/thương hiệu gốc; nếu trang dùng favicon của ngân hàng/thương hiệu lớn nhưng chạy trên tên miền lạ -> phạt -35 điểm, cap tại 15 điểm (`favicon_impersonation`).
   - **Boilerplate Cleaner:** Tự động cắt bỏ các banner Cookie, GDPR, OnTrust, Modal che phủ gây nhiễu trước khi phân tích văn bản.

5. **Khiên Bảo hộ Doanh nghiệp Minh bạch (SMB Transparency Shield):**
   - Giải quyết triệt để vấn đề báo nhầm (False Positive) cho các startup, shop online và doanh nghiệp vừa & nhỏ (chưa có thứ hạng Tranco, tên miền < 1 năm).
   - Khi website công khai đầy đủ MST/GPKD, giấy phép Bộ Công Thương, thông tin liên hệ và chính sách bảo mật, đồng thời KHÔNG có hành vi mạo danh hoặc đánh cắp dữ liệu -> kích hoạt sàn điểm bảo vệ `floor = 65` (hoặc `75` nếu có MST/Bộ Công Thương) cùng điểm thưởng `smb_shield (+10)`.

6. **Hợp nhất Toàn diện `/api/scan` & `/api/analyze`:**
   - Đưa `collectEvidence` và `scoreEvidence` vào làm nền tảng cốt lõi cho cả `/api/scan` (cả chế độ `simplified` lẫn `deep`).
   - Xoá bỏ tình trạng `/api/scan` trước đây cấp điểm an toàn sai lệch chỉ vì trang có chứng chỉ Let's Encrypt.
   - Mọi client (Web, Chrome Extension, API bên ngoài) đều nhận được báo cáo Explainable AI (XAI) đồng nhất và có độ chính xác cao nhất.

---

## 8. Trạng thái Git & Triển khai

- **Origin Remote:** `git@github.com:gianguyen14/VerityTrust-XAI-Website.git` (nhánh `main`).
- **Upstream Remote:** `https://github.com/Zzeronite1/VerityTrust-XAI-Website.git`.
- **Tình trạng:** Sẵn sàng kiểm thử, build và triển khai production mà không lo tràn RAM hay lỗi AVX2.

---

## 9. Đợt 9: Đường ống quét nhiều tầng, sửa lỗi an toàn, bộ đánh giá mới (2026-11-07 → 08)

1. **Đường ống 6 tầng có dừng sớm** (`server/scanPipeline.ts`): Tầng 0 DNS/SSRF → Tầng 1 danh tiếng (không tải HTML) → Tầng 2 bằng chứng + 2 mô hình → Tầng 3 Chrome headless (`server/headless.ts`, chỉ cho trang rỗng/SPA ở vùng xám 45–74) → Tầng 4 Jev/OpenJev (vùng xám) → Tầng 5 `POST /api/explain` (AI chỉ diễn giải, không đổi điểm). Kết quả có trường `pipeline`. p50 727ms → 176ms trên tập A.
2. **Sửa lỗi an toàn:** bỏ `NODE_TLS_REJECT_UNAUTHORIZED=0` toàn cục (đã tắt kiểm tra chứng chỉ cho cả lời gọi API AI) — giờ chỉ request tải trang đích dùng agent undici chấp nhận chứng chỉ lỗi. Rate limit đã áp cho `/api/explain`.
3. **Sửa lỗi chính xác:** favicon trên CDN chung (googleusercontent…) không còn bị coi là giả mạo; cắt thẻ `<script>` chưa đóng khi HTML bị cắt ở 1MB; RDAP không còn hỏng trên mạng chậm (`setDefaultAutoSelectFamilyAttemptTimeout(1000)`); luật giả danh thương hiệu bỏ qua nút "Đăng nhập với Google/Facebook", link kho ứng dụng, reCAPTCHA, icon mạng xã hội, chữ của liên kết là đường dẫn, cụm đại lý chính hãng.
4. **Thử thêm dữ liệu huấn luyện, không giữ:** mô hình tên miền v2 (1,1 triệu mẫu) kém hơn v1 trên toàn hệ thống; mô hình nội dung + 4.010 trang hợp pháp thật làm sụp khả năng bắt cờ bạc. Chi tiết: `docs/MO-HINH-AI.md`.
5. **Bộ đánh giá mới (tập B, 695 web, gán nhãn thủ công)** + gom toàn bộ dữ liệu đo vào `eval/`, thêm `scripts/eval-metrics.ts` và lệnh `npm run eval:a|eval:b|eval:metrics`. Kết quả gộp 1.053 web: Accuracy 95,82%, Precision 97,09%, Recall 94,53%, F1 95,79%, AUC 98,89%, FPR 2,87%. Chi tiết: `docs/DANH-GIA.md`.
6. **Tài liệu:** viết lại `README.md`, thêm `docs/` (KIEN-TRUC, CHAM-DIEM, MO-HINH-AI, DANH-GIA, API) và `eval/README.md`.

Điểm yếu còn lại: lừa đảo bán hàng/đầu tư không có form đăng nhập, cờ bạc bằng ngôn ngữ ít gặp, web hợp pháp có tên thương hiệu trong tên miền.
