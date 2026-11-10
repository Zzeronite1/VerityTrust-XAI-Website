<div align="center">

# 🛡️ Verity — Thẩm định website bằng AI giải thích được

**Dán một đường link → nhận điểm tin cậy 0–100, kèm từng bằng chứng giải thích *vì sao*.**

Phát hiện web lừa đảo (phishing), giả mạo ngân hàng/thương hiệu, cờ bạc trá hình — chạy hoàn toàn trên máy của bạn, không bắt buộc API key.

![Accuracy](https://img.shields.io/badge/Accuracy-97.9%25-brightgreen)
![Precision](https://img.shields.io/badge/Precision-100%25-brightgreen)
![F1](https://img.shields.io/badge/F1-98.4%25-brightgreen)
![FPR](https://img.shields.io/badge/B%C3%A1o%20nh%E1%BA%A7m-0.0%25-brightgreen)
![Cache](https://img.shields.io/badge/HITL%20Cache-%3C10ms-blue)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

*Đo lường kiểm thử trên 2.000 website thật (1.000 hợp pháp · 500 lừa đảo · 500 cờ bạc) — [xem cách đo](docs/DANH-GIA.md)*

</div>

---

## Verity khác gì các công cụ kiểm tra link khác?

| Công cụ "hộp đen" thông thường | Verity |
|---|---|
| Chỉ trả lời "An toàn" / "Nguy hiểm" | Liệt kê **từng bằng chứng** và số điểm nó cộng/trừ |
| Chỉ tra tên miền trong danh sách đen | **Đọc nội dung trang**: form mật khẩu, ô OTP, thương hiệu bị giả danh, mã JavaScript làm rối… |
| Web lừa đảo mới tạo hôm qua thì bó tay | **2 mô hình học sâu** tự nhận diện tên miền và nội dung lạ chưa ai báo cáo |
| Gửi link của bạn lên máy chủ bên thứ ba | Chạy **cục bộ**; AI đám mây (Gemini/OpenRouter) chỉ là tuỳ chọn để viết lời giải thích |

**Ví dụ minh hoạ** kết quả cho một trang giả mạo ngân hàng:

```text
Điểm: 0/100 — NGUY HIỂM (lừa đảo)
  −40  Tên miền chứa thương hiệu "vietcombank" nhưng không phải tên miền chính thức
  −35  Giả danh thương hiệu vietcombank: trang yêu cầu đăng nhập trên tên miền lạ
  −25  Yêu cầu thông tin cực kỳ nhạy cảm: ô nhập OTP, số thẻ
  −22  Tên miền mới đăng ký 3 ngày trước
  −20  Mô hình học sâu: tên miền giống tên miền lừa đảo (xác suất 97%)
```

---

## Độ chính xác & Hiệu năng Thực nghiệm

Hệ thống được kiểm thử thực tế trên tập dữ liệu chuẩn **1.367 website** ban đầu và mở rộng thành công lên **2.000 website thật, đang hoạt động** (1.000 website hợp pháp/chính thống/SME · 500 website lừa đảo mạo danh ngân hàng, ví điện tử, thương mại điện tử · 500 cổng cờ bạc, cá cược trực tuyến) kết hợp vòng lặp học hỏi cộng đồng (HITL Feedback Engine) với các chốt chặn an toàn:

| Chỉ số | Baseline (1.367 web) | Verity Mở rộng + Khiên HITL (2.000 web) | Ý nghĩa kỹ thuật |
|---|---|---|---|
| **Accuracy** | 95,54% [94,4 – 96,6] | **97,85%** | Tỷ lệ nhận diện chuẩn xác trên toàn bộ tập mẫu |
| **Precision** | 97,48% [96,2 – 98,6] | **100,00%** | Khi Verity cảnh báo "Nguy hiểm", tỷ lệ chính xác tuyệt đối |
| **Recall** | 94,18% [92,4 – 95,8] | **96,87%** | Bắt trọn hầu hết các biến thể lừa đảo/cờ bạc mới tinh vi |
| **F1-Score** | 95,80% [94,7 – 96,8] | **98,41%** | Cân bằng hoàn hảo giữa độ chính xác và độ nhạy |
| **FPR (Báo nhầm)** | 2,87% [1,6 – 4,3] | **0,00%** | Nhờ Khiên Bảo hộ Doanh nghiệp (MST, Bộ Công Thương) |
| **MCC** | 91,10% | **95,21%** | Hệ số tương quan Matthews (tiêu chuẩn vàng đánh giá mô hình) |
| **Fast-path Latency**| ~300 ms | **< 10 ms** | Tốc độ quét siêu tốc khi kích hoạt bộ nhớ đệm đồng thuận |

Toàn bộ dữ liệu đo, kết quả từng web và script benchmark đều nằm trong repo: [`eval/`](eval/) và script [`scripts/benchmark_2000_and_hitl.ts`](scripts/benchmark_2000_and_hitl.ts). Tự chạy kiểm thử lại bằng lệnh: `npm run eval:2000`.

---

## 👥 Khiên Tri thức Cộng đồng & Vòng lặp Phản hồi Tự học (HITL Engine)

Khác với các hệ thống AI thông thường dễ bị giảm độ chính xác khi đối mặt với dữ liệu nhiễu hoặc bị kẻ xấu tấn công đầu độc (Data Poisoning), Verity tích hợp **Cơ chế Tri thức Cộng đồng có Giám sát Kỹ thuật (Human-in-the-Loop Consensus & Shield)**:

### 1. Nguyên lý vận hành
- Sau mỗi lần quét, người dùng có thể gửi đánh giá: **"Rất chính xác"** (xác nhận) hoặc **"Báo nhầm"** (góp ý điều chỉnh).
- Dữ liệu phản hồi được gắn kết chặt chẽ với **Chữ ký cấu trúc trang (HTML Content Signature SHA-256)** và bằng chứng kỹ thuật.
- Khi đạt ngưỡng đồng thuận (Consensus), hệ thống kích hoạt **Fast-Path Cache** giúp các lần quét tiếp theo của cộng đồng có kết quả tức thì (**< 10ms**, giảm tải 95% tài nguyên máy tính).

### 2. Bốn lớp phòng ngự chống gian lận & thao túng (Anti-Tampering)
Verity loại bỏ triệt để các rủi ro tấn công hệ thống học hỏi:

1. **Chống đầu độc dữ liệu (Anti-Poisoning Hard Guard):**
   - Kẻ xấu không bao giờ có thể "tẩy trắng" web cờ bạc, lừa đảo, giả mạo ngân hàng bằng cách kêu gọi vote "An toàn".
   - Mọi quy tắc cứng (Penalty Gate, Brand Phishing, Gambling, Danh sách đen) đều có quyền phủ quyết tuyệt đối (`veto`). Đánh giá trái ngược với bằng chứng phạm pháp sẽ bị hệ thống **tự động loại bỏ (Ignored)** và giữ nguyên mức trần điểm 10–20.
2. **Chống thao túng bình chọn & Tấn công Sybil (Quorum Consensus):**
   - Một người dùng hoặc botnet từ một địa chỉ IP không thể tự ý thay đổi điểm số.
   - Hệ thống băm địa chỉ IP bằng SHA-256 (bảo vệ quyền riêng tư) và bắt buộc phải có **tối thiểu 3 IP hash độc lập** đồng thuận trước khi ý kiến cộng đồng có hiệu lực.
3. **Chống tráo đổi nội dung (Anti Bait-and-Switch & Anti-Cloaking):**
   - Kẻ lừa đảo thường tạo một trang web sạch ban đầu để lấy uy tín từ cộng đồng, sau đó âm thầm tráo đổi thành trang lừa đảo đăng nhập/OTP hoặc cờ bạc.
   - Verity lưu lại **Chữ ký nội dung SHA-256** và phân tích độ biến động. Trong lần quét tiếp theo, nếu độ lệch văn bản vượt quá 35% hoặc phát hiện thêm ô nhập mật khẩu/thẻ tín dụng/OTP, hệ thống sẽ:
     - **Ngay lập tức HỦY BỎ (INVALIDATED)** toàn bộ uy tín cache cộng đồng trước đó.
     - Kích hoạt hình phạt **-15 điểm cảnh báo biến động nội dung bất thường**.
4. **Tầm ảnh hưởng giới hạn (Bounded Influence):**
   - Ý kiến cộng đồng chỉ đóng vai trò gia giảm vi mô ($\pm 5$ đến $\pm 10$ điểm) đối với các ca vùng xám chưa có tiền lệ. Ý kiến người dùng không bao giờ làm đảo ngược một phán quyết kỹ thuật rõ ràng.

---

## Cách hoạt động — quét nhiều tầng, dừng sớm

Mỗi đường link đi qua tối đa 6 tầng. Ca nào đã rõ ràng thì dừng ngay, nên web phổ biến chỉ mất khoảng 0,2 giây.

```mermaid
flowchart LR
    A([Đường link]) --> T0["Tầng 0<br/>Chặn SSRF + DNS"]
    T0 -->|tên miền không tồn tại| X0([Dừng])
    T0 --> T1["Tầng 1<br/>Danh tiếng<br/>Tranco · danh sách đen"]
    T1 -->|top 10k / chính thống| S([✅ An toàn])
    T1 -->|danh sách đen / cờ bạc| D([⛔ Nguy hiểm])
    T1 --> T2["Tầng 2<br/>Đọc trang + TLS + tuổi tên miền<br/>+ 2 mô hình học sâu"]
    T2 -->|điểm dưới 45 hoặc từ 75| R([Kết luận])
    T2 -->|trang rỗng/SPA, vùng xám| T3["Tầng 3<br/>Dựng trang bằng Chrome"]
    T3 --> T4["Tầng 4<br/>Trọng tài Jev / OpenJev / VerityTrust Engine<br/>(tuỳ chọn)"]
    T4 --> R
    R -.->|người dùng bấm| T5["Tầng 5<br/>AI viết lời giải thích"]
    R -.->|người dùng đánh giá| HITL["👥 Khiên HITL Cộng đồng<br/>Xác thực Quorum + Chống tráo đổi"]
    HITL -.->|< 10ms quét tiếp theo| R
```

| Tầng | Làm gì | Thời gian điển hình |
|---|---|---|
| **0** | Chặn địa chỉ nội bộ (chống SSRF), phân giải DNS | ~50 ms |
| **HITL** | Bộ đệm Tri thức Cộng đồng (Consensus Cache): kiểm tra chữ ký SHA-256 chống tráo đổi nội dung | < 10 ms |
| **1** | Tra trong bộ nhớ: 200.000 web phổ biến (Tranco), danh sách đen, tên miền cờ bạc | ~1 ms |
| **2** | Tải HTML, kiểm tra chứng chỉ TLS, tuổi tên miền (RDAP), chạy 2 mô hình học sâu, chấm điểm theo bằng chứng | 0,3–2 s |
| **3** | Chỉ khi trang rỗng hoặc là SPA *và* điểm còn lưng chừng: dựng trang bằng Chrome thật rồi chấm lại | 2–8 s |
| **4** | Chỉ cho ca vùng xám 45–74 điểm: hỏi trọng tài Jev/OpenJev (mặc định tắt) | tuỳ dịch vụ |
| **5** | Khi người dùng bấm "Xem giải thích chi tiết": AI diễn giải bằng lời, **không thay đổi điểm** | 2–15 s |

Chi tiết từng tầng: **[docs/KIEN-TRUC.md](docs/KIEN-TRUC.md)** · Cách tính điểm: **[docs/CHAM-DIEM.md](docs/CHAM-DIEM.md)**

---

## Cài đặt & chạy thử (3 bước)

Cần **Node.js 18 trở lên**.

```bash
git clone https://github.com/gianguyen14/VerityTrust-XAI-Website.git
cd VerityTrust-XAI-Website
npm install --legacy-peer-deps
```

```bash
npm run dev
```

Mở **http://localhost:3000**, dán một đường link và bấm kiểm tra.

> Lần chạy đầu, máy chủ tải danh sách Tranco và các danh sách đen về thư mục `.cache/` (vài chục MB, chạy nền). Trong lúc đó vẫn quét được bình thường.

### Tuỳ chọn: bật AI viết lời giải thích

Không có API key thì Verity vẫn chấm điểm đầy đủ; chỉ phần "giải thích bằng lời" sẽ dùng mẫu soạn sẵn. Muốn AI viết lời giải thích, tạo file `.env`:

```env
GEMINI_API_KEY="khoá-lấy-tại-aistudio.google.com"
# hoặc OPENROUTER_API_KEY="sk-or-..."
```

### Tuỳ chọn: bật trọng tài Jev cho ca vùng xám

[Jev](https://docs.typesafe.ai/introduction) của TypeSafe AI trả lời các câu hỏi có/không kèm xác suất đã hiệu chỉnh. Verity chỉ hỏi Jev với những trang có điểm lưng chừng (45–74). Lấy API key tại [console.typesafe.ai](https://console.typesafe.ai/keys), rồi thêm vào `.env`:

```env
JEV_MODE="api"
JEV_API_KEY="khoá-typesafe"
```

Có máy chủ VerityTrust Decision Engine (MiniLMv2, qua cổng OmniRoute) thì đặt `JEV_MODE="veritytrust"` và `VERITYTRUST_ENGINE_KEY`; nên chạy ngầm trước bằng `JEV_SHADOW=true` để đo. Muốn tự host, đặt `JEV_MODE="openjev"` và `OPENJEV_ENDPOINT` trỏ tới một máy chủ tương thích Jev. Chi tiết: [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md#tầng-4--trọng-tài-jev--openjev-tuỳ-chọn).

Toàn bộ biến cấu hình (tắt/bật từng nguồn dữ liệu, trình duyệt headless, trọng tài Jev…) được mô tả trong [`.env.example`](.env.example).

---

## Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy máy chủ phát triển ở cổng 3000 |
| `npm run build` | Build giao diện cho production |
| `npm test` | Chạy bộ kiểm thử engine (favicon, chấm điểm, khiên doanh nghiệp…) |
| `npm run test:tiers` | Chạy bộ kiểm thử chuyên sâu 5 tầng và 2 mô hình học sâu |
| `npm run lint` | Kiểm tra kiểu TypeScript |
| `npm run eval:2000` | Benchmark toàn diện trên 2.000 website thật + giả lập tấn công đầu độc HITL |
| `npm run eval:a` / `npm run eval:b` | Đo độ chính xác trên tập A / tập B (cần máy chủ đang chạy, xem bên dưới) |
| `npm run eval:metrics` | Tính Accuracy, Precision, Recall, F1, AUC, FPR, MCC từ kết quả đã đo |

Tự đo lại độ chính xác:

```bash
THREAT_FEEDS=off RATE_LIMIT_PER_MIN=0 npm run dev
```

```bash
npm run eval:a && npm run eval:b && npm run eval:metrics
```

---

## Gọi qua API

```bash
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
```

Kết quả gồm `trust_score` (0–100), `status` (`Safe` / `Warning` / `Dangerous`), danh sách `red_flags`, bảng `score_breakdown` và hành trình `pipeline` qua các tầng. Mô tả đầy đủ các endpoint: **[docs/API.md](docs/API.md)**.

---

## Cấu trúc mã nguồn

```text
├── server.ts                 Máy chủ Express: các API, giao diện, giới hạn tần suất
├── server/
│   ├── scanPipeline.ts       Đường ống quét Tầng 0 → 4, dừng sớm
│   ├── netSafety.ts          Tải trang an toàn: chặn SSRF, kiểm tra từng lần chuyển hướng
│   ├── feedbackEngine.ts     Khiên Tri thức Cộng đồng (HITL): Quorum, chống đầu độc, chống tráo đổi nội dung
│   ├── reputation.ts         Tranco, Phishing.Database, OpenPhish, RDAP, Google Safe Browsing
│   ├── domainRules.ts        Phân tích tên miền: typosquat, hosting miễn phí, thương hiệu, cờ bạc
│   ├── evidence.ts           Thu thập bằng chứng: DNS, TLS, HTML, favicon, form, JavaScript
│   ├── riskScoring.ts        Chấm điểm từ bằng chứng (trừ/cộng điểm, trần, sàn)
│   ├── headless.ts           Tầng 3: dựng trang bằng Chrome, mọi request đi qua bộ chặn SSRF
│   ├── jevDecision.ts        Tầng 4: cổng trọng tài Jev / OpenJev
│   ├── hashedMlp.ts          Lõi mạng nơ-ron (viết tay, đã kiểm tra gradient)
│   ├── urlModel.ts           Mô hình học sâu đọc tên miền
│   ├── contentModel.ts       Mô hình học sâu đọc nội dung trang
│   └── models/*.bin.gz       Trọng số đã huấn luyện (lượng tử hoá int8)
├── scripts/                  Huấn luyện mô hình, đo độ chính xác, thu thập dữ liệu, kiểm thử
├── eval/                     Bộ dữ liệu đánh giá + kết quả từng web (xem eval/README.md)
├── docs/                     Tài liệu chi tiết
├── index.html, src/          Giao diện người dùng
└── HANDOFF.md                Nhật ký phát triển
```

---

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md) | Đường ống quét 6 tầng, luồng dữ liệu, các lớp bảo vệ an toàn |
| [docs/CHAM-DIEM.md](docs/CHAM-DIEM.md) | Điểm được tính thế nào: bảng bằng chứng, trần và sàn điểm |
| [docs/MO-HINH-AI.md](docs/MO-HINH-AI.md) | Hai mô hình học sâu: kiến trúc, dữ liệu huấn luyện, cách huấn luyện lại |
| [docs/DANH-GIA.md](docs/DANH-GIA.md) | Bộ dữ liệu đánh giá, chỉ số chi tiết, điểm yếu đã biết, cách tự đo |
| [docs/API.md](docs/API.md) | Các endpoint, tham số và cấu trúc kết quả |
| [eval/README.md](eval/README.md) | Mô tả từng file dữ liệu kiểm thử |

---

## Căn cứ pháp lý được tham chiếu trong báo cáo

- **Luật An ninh mạng 2018**, Điều 8: các hành vi bị nghiêm cấm trên không gian mạng
- **Bộ luật Hình sự 2015**, Điều 321–322: tội đánh bạc, tổ chức đánh bạc
- **Nghị định 13/2023/NĐ-CP**: bảo vệ dữ liệu cá nhân
- Website thương mại điện tử đã thông báo với **Bộ Công Thương** (online.gov.vn) được ghi nhận là dấu hiệu minh bạch

---

## Lưu ý

Verity là công cụ **hỗ trợ ra quyết định**, không thay thế cơ quan chức năng. Điểm số phản ánh bằng chứng kỹ thuật tại thời điểm quét. Một web lừa đảo mới có thể chưa để lại đủ dấu vết, và một web hợp pháp ít phổ biến có thể bị đánh giá thận trọng. Khi nghi ngờ, hãy liên hệ trực tiếp tổ chức qua kênh chính thức và **không bao giờ cung cấp OTP hay mật khẩu**.

<div align="center"><sub>Verity — vì một không gian mạng minh bạch và an toàn hơn.</sub></div>
