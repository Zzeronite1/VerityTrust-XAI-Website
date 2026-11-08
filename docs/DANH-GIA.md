# Đánh giá độ chính xác

[← Về README](../README.md)

Tài liệu này trả lời ba câu hỏi: **Verity chính xác đến đâu? Đo bằng dữ liệu gì? Tự đo lại thế nào?**

## Kết quả tổng hợp

Đo trên **1.053 website thật, đang hoạt động**. Lúc đo, tra cứu danh sách đen bị **tắt** (`THREAT_FEEDS=off`), để hệ thống không "tra đáp án" từ chính nguồn dùng làm đề mà phải tự phát hiện từ bằng chứng. Trong ngoặc vuông là khoảng tin cậy 95% (bootstrap 2.000 lần).

**Quy ước:** *dương tính* = web nguy hiểm (lừa đảo hoặc cờ bạc); hệ thống kết luận "nguy hiểm" khi **điểm < 50**.

| | Dự đoán nguy hiểm | Dự đoán không nguy hiểm |
|---|---|---|
| **Thực tế nguy hiểm (530)** | ✅ TP = 501 | ❌ FN = 29 (bỏ sót) |
| **Thực tế hợp pháp (523)** | ❌ FP = 15 (báo nhầm) | ✅ TN = 508 |

| Chỉ số | Gộp (1.053) | Tập A (358) | Tập B (695) |
|---|---|---|---|
| **Accuracy** | **95,82%** [94,5 – 97,0] | 98,60% | 94,39% |
| **Precision** | **97,09%** [95,5 – 98,5] | 100,00% | 95,92% |
| **Recall (TPR)** | **94,53%** [92,5 – 96,4] | 96,73% | 93,63% |
| **F1-Score** | **95,79%** [94,5 – 96,9] | 98,34% | 94,77% |
| **AUC-ROC** | **98,89%** [98,3 – 99,4] | 99,97% | 98,11% |
| **FPR** | **2,87%** [1,6 – 4,4] | 0,00% | 4,72% |
| **Specificity** | 97,13% | 100,00% | 95,28% |
| **MCC** | 91,68% | 97,17% | 88,75% |

### Các chỉ số nghĩa là gì?

| Chỉ số | Câu hỏi nó trả lời |
|---|---|
| **Accuracy** | Trong tất cả web đã quét, bao nhiêu phần trăm kết luận đúng? |
| **Precision** | Khi Verity báo "nguy hiểm", bao nhiêu phần trăm là nguy hiểm thật? (cao = ít báo động giả) |
| **Recall** | Trong tất cả web nguy hiểm, Verity bắt được bao nhiêu phần trăm? (cao = ít bỏ sót) |
| **F1-Score** | Trung bình điều hoà của Precision và Recall; hữu ích khi dữ liệu mất cân bằng |
| **AUC-ROC** | Chọn ngẫu nhiên một web nguy hiểm và một web hợp pháp: xác suất web nguy hiểm bị chấm điểm thấp hơn. Không phụ thuộc ngưỡng |
| **FPR** | Bao nhiêu phần trăm web hợp pháp bị báo nhầm là nguy hiểm? (thấp = tốt) |
| **MCC** | Hệ số tương quan giữa dự đoán và thực tế, từ −100% đến 100%; phạt cả báo nhầm lẫn bỏ sót |

### Nếu tính cả mức "Cảnh báo" là nguy hiểm (điểm < 75)

Bỏ sót gần như không còn, đổi lại nhiều web hợp pháp ít phổ biến bị xếp "Cảnh báo".

| Accuracy | Precision | Recall | F1 | FPR |
|---|---|---|---|---|
| 92,50% | 87,90% | **98,68%** | 92,98% | 13,77% |

Nói cách khác: chỉ **7/530** web nguy hiểm (1,3%) bị xếp nhầm vào mức "An toàn".

---

## Hai tập dữ liệu

Mọi file nằm trong [`eval/`](../eval/README.md).

### Tập A — 358 web (dễ hơn)

| Nhóm | Số lượng | Nguồn |
|---|---|---|
| Hợp pháp | 205 | Web Việt Nam và quốc tế phổ biến: ngân hàng, báo, TMĐT, cơ quan nhà nước |
| Cờ bạc | 33 | Nhà cái và cờ bạc trá hình |
| Lừa đảo | 120 | Chọn ngẫu nhiên (seed 3) từ 300 URL của [OpenPhish](https://openphish.com), chụp ngày 07/11/2026 |

### Tập B — 695 web (khó hơn, gán nhãn thủ công ngày 08/11/2026)

| Nhóm | Số lượng | Nguồn |
|---|---|---|
| Hợp pháp | 318 | Web **ngoài top 10.000** Tranco (phần lớn `.vn`, tức web nhỏ, ít người biết); 12 web hợp pháp có tên thương hiệu trong tên miền (`whatsapp-fast.vercel.app`, `vodafone-business-berlin.de`…) |
| Cờ bạc | 192 | [hagezi gambling list](https://github.com/hagezi/dns-blocklists); 10 blog vệ tinh SEO cho casino; web cờ bạc giả trang Google Play |
| Lừa đảo | 185 | [phishunt.io](https://phishunt.io) (176 trong 1.003 URL), [tinnhiemmang.vn](https://tinnhiemmang.vn/website-lua-dao) (NCSC Việt Nam), blocklist web bán hàng lừa đảo, phishing.army |

**Cách gán nhãn tập B:** đọc tiêu đề và nội dung của khoảng 1.400 trang.
- Chỉ tính **lừa đảo** khi có dấu hiệu rõ ràng: form đăng nhập giả, trang ví crypto/seed phrase giả, file cài Chrome/Adobe giả, thẻ quà tặng giả, sàn đầu tư AI giả, shop bán súng/chó/cần sa giả.
- **Bỏ khỏi tập** các trang không chắc chắn: blog cũ chỉ có tên "facebook", đồ án sao chép giao diện có ghi chú rõ, trang đã chết, trang đỗ tên miền.
- Không trang nào thuộc hai tập này được dùng để huấn luyện mô hình.

---

## Điểm yếu đã biết

Những ca Verity còn sai, rút từ tập B:

| Loại | Ví dụ | Vì sao khó |
|---|---|---|
| **Lừa đảo bán hàng / đầu tư không có form đăng nhập** | Shop súng giả (85 điểm), sàn đầu tư AI (82), đại lý vé giả mạo Vietnam Airlines (98), web bán bằng giả | Không có ô mật khẩu, không giả thương hiệu trên tên miền; trông như một shop bình thường |
| **Cờ bạc bằng ngôn ngữ ít gặp** | Trang cá cược tiếng Thái, Thổ Nhĩ Kỳ, Ba Tư, Indonesia | Từ khoá cờ bạc chủ yếu là tiếng Việt và tiếng Anh; chỉ bị xếp "Cảnh báo" (52–74) |
| **Web hợp pháp có tên thương hiệu trong tên miền** | `whatsapp-fast.vercel.app`, `netflixvoid.org`, `googleapps.lk` | Trông y hệt kỹ thuật mạo danh phổ biến nhất |
| **Trang chỉ có form đăng nhập** | Cổng đăng nhập của cơ quan, ứng dụng nội bộ | Không có nội dung nào khác để phân biệt với trang phishing |

**Về độ "sạch" của số đo tập B:** luật giả danh thương hiệu được sửa sau khi xem lỗi trên tập B, nên số đo của tập B hơi lạc quan. Con số trước khi sửa (chưa tinh chỉnh) là: Accuracy 93,24%, Precision 93,65%, Recall 93,90%, F1 93,77%, AUC 97,66%, FPR 7,55%. Kết quả từng web của cả hai lần đo đều có trong [`eval/results/`](../eval/results/).

---

## Tự đo lại

**1. Chạy máy chủ** với danh sách đen tắt và không giới hạn tần suất:

```bash
THREAT_FEEDS=off RATE_LIMIT_PER_MIN=0 npm run dev
```

**2. Mở terminal khác, chạy hai tập** (mất khoảng 3–6 phút mỗi tập):

```bash
npm run eval:a
```

```bash
npm run eval:b
```

**3. Tính chỉ số:**

```bash
npm run eval:metrics
```

Muốn tính cho một tập riêng: `npx tsx scripts/eval-metrics.ts eval/results/set-b.json`.

> ⚠️ **Lưu ý:**
> - Web thật thay đổi theo thời gian: trang lừa đảo bị gỡ, web hợp pháp đổi giao diện. Kết quả đo lại sẽ chênh lệch vài phần trăm so với số ở trên; phần lớn chênh lệch đến từ trang đã chết.
> - Khi đo, máy chủ **sẽ tải HTML của các trang lừa đảo thật**. Hệ thống không chạy JavaScript của trang ở Tầng 2, nhưng vẫn nên chạy trong môi trường bạn chấp nhận được.

### Đo thử trên dữ liệu của bạn

Tạo file JSON có dạng:

```json
{ "safe": ["vietcombank.com.vn", "https://shopcuaban.vn/"], "dangerous": ["https://web-co-bac.xyz/"] }
```

Thêm danh sách phishing (mỗi dòng một URL) nếu có, rồi chạy:

```bash
npx tsx scripts/eval-accuracy.ts --dataset du-lieu.json --phishing-file phishing.txt --phishing 1000 --out ket-qua.json
```

```bash
npx tsx scripts/eval-metrics.ts ket-qua.json
```
