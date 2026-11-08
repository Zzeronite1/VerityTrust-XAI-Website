# Hai mô hình học sâu

[← Về README](../README.md)

Verity có **2 mạng nơ-ron chạy cục bộ**, không cần GPU, không gọi dịch vụ ngoài. Mỗi lần chấm mất dưới 1 ms. Chúng giúp phát hiện **web lừa đảo mới tinh** mà chưa danh sách đen nào kịp ghi nhận.

| | Mô hình tên miền | Mô hình nội dung |
|---|---|---|
| Đọc gì | Tên miền, vd `vietcombank-xacminh.top` | Tiêu đề, mô tả, chữ trên trang + 20 đặc trưng cấu trúc |
| Mã | [`server/urlModel.ts`](../server/urlModel.ts) | [`server/contentModel.ts`](../server/contentModel.ts) |
| Trọng số | `server/models/phishing-domain-model.bin.gz` (4,6 MB) | `server/models/phishing-content-model.bin.gz` (2,7 MB) |
| Dữ liệu huấn luyện | 549.674 tên miền thật | 80.000 trang tổng hợp từ tri thức chuyên gia |
| AUC-ROC khi chạy riêng | **91,6%** (tập kiểm định) | **90,4%** (147 trang thật chưa từng thấy) |
| Tắt bằng | `URL_MODEL=off` | `CONTENT_MODEL=off` |

> Chạy riêng, mỗi mô hình chỉ đạt khoảng 90% AUC. Vì vậy chúng **không tự quyết định**. Chúng chỉ đóng góp *một bằng chứng trừ điểm* ở ngưỡng cao (để ít báo nhầm), bên cạnh DNS, TLS, tuổi tên miền và các luật nội dung. Kết hợp lại, toàn hệ thống đạt AUC 98,9%.

---

## Kiến trúc chung

Cả hai dùng chung lõi [`server/hashedMlp.ts`](../server/hashedMlp.ts): một mạng **embedding bag + MLP**, tự viết bằng TypeScript.

```text
văn bản ──► tách n-gram / từ ──► băm (hashing) ──► Embedding (bảng B × D) ──► gộp trung bình ─┐
đặc trưng số (độ dài, tỷ lệ chữ số, có ô mật khẩu…) ─────────────────────────────────────────┴─► Dense(H, ReLU) ─► Dense(1, sigmoid) ─► xác suất lừa đảo
```

- **Băm đặc trưng (hashing trick):** không cần từ điển cố định, nên chịu được từ mới, sai chính tả và ngôn ngữ lạ.
- **Lan truyền ngược viết tay**, đã kiểm tra bằng gradient số (sai số khoảng 1e-7).
- **Lượng tử hoá int8** và nén gzip để file trọng số nhỏ gọn.
- Phần trích đặc trưng dùng chung cho huấn luyện và suy luận, nên luôn khớp nhau.

## Mô hình tên miền

**Đầu vào:** tên miền chủ sở hữu, tách thành n-gram ký tự độ dài 3–5 và các token, cộng 10 đặc trưng cấu trúc (độ dài, tỷ lệ chữ số, entropy, số dấu gạch…).

**Dữ liệu:**
- Nhãn "lừa đảo": 274.837 tên miền từ [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database).
- Nhãn "hợp pháp": 274.837 tên miền từ [Tranco](https://tranco-list.eu), dùng toàn bộ danh sách, kể cả top 20.000.

Mọi tên miền thuộc các tập đánh giá đều bị loại khỏi dữ liệu huấn luyện.

**Bài học khi huấn luyện:** lần đầu loại các thương hiệu lớn khỏi nhóm hợp pháp, mô hình học sai rằng "có tên thương hiệu = lừa đảo" và chấm `paypal.com` 100% lừa đảo. Giữ toàn bộ Tranco đã sửa được lỗi này.

**Cách dùng trong điểm số:** xác suất ≥ 95% → −20 điểm; ≥ 85% → −12 điểm. Chỉ áp dụng cho web không phổ biến và không chính thống.

## Mô hình nội dung

**Đầu vào:**
- Từ đơn và cặp từ của tiêu đề, mô tả và nội dung; thêm bản bỏ dấu tiếng Việt và bigram chữ Hán.
- 20 đặc trưng cấu trúc: có ô mật khẩu, ô OTP/thẻ/cụm từ khôi phục, form gửi ra ngoài, liên kết rỗng…
- Trọng số chú ý giả (pseudo-attention) cho từng token, và subword n-gram.

**Dữ liệu — "chưng cất tri thức":** trang lừa đảo thật chết rất nhanh (hơn 90% URL "đang hoạt động" trong các danh sách đã chết), nên không đủ để huấn luyện. Thay vào đó, [`scripts/content-corpus.ts`](../scripts/content-corpus.ts) sinh 80.000 trang tổng hợp từ:

- **15 kịch bản lừa đảo/cờ bạc:**
  - giả ngân hàng, giả ví crypto, giả Facebook/Meta;
  - trúng thưởng, việc nhẹ lương cao, đầu tư đa cấp;
  - nhà cái, tài xỉu…
- **23 loại trang hợp pháp,** kể cả mẫu khó: trang đăng nhập của doanh nghiệp, trang ngân hàng thật, shop có nút "Đăng nhập"…
- **Nhiều ngôn ngữ,** kèm nhiễu: từ độn, tráo cấu trúc, lỗi chính tả.

**Đánh giá:** chạy trên trang thật tải về, chia hai nửa.
- Nửa "tune" dùng để tìm lỗi.
- Nửa "test" chỉ dùng để báo cáo, không xem lỗi.
- Kết quả trên nửa test: AUC **90,4%**; ở ngưỡng 0,75 đạt precision 89,8%, recall 73,3%, FPR 5,75%.

**Cách dùng trong điểm số:** rủi ro ≥ 92% → −25 điểm, và trần 35 điểm nếu trang không có thông tin pháp lý; ≥ 90% → −15 điểm; ≥ 82% → −8 điểm.

---

## Huấn luyện lại

```bash
npx tsx scripts/train-url-model.ts
```

```bash
npx tsx scripts/train-content-model.ts
```

```bash
npx tsx scripts/eval-content-model.ts --tune-phishing <feed1.txt> --test-phishing <feed2.txt>
```

- `train-url-model.ts` tự tải Phishing.Database và Tranco về `.cache/training/`. Tuỳ chọn: thêm Majestic / Umbrella làm nhóm hợp pháp (`--majestic off`, `--umbrella off` để tắt), thêm nguồn phishing bằng `--pdb`.
- `train-content-model.ts` có thể trộn trang thật đã thu thập: `--real file.jsonl --real-weight N`.
- [`scripts/collect-pages.ts`](../scripts/collect-pages.ts) thu thập trang thật để huấn luyện. Script tự loại mọi web thuộc tập đánh giá.

### Các thí nghiệm đã thử nhưng không giữ

| Thí nghiệm | Kết quả | Lý do không giữ |
|---|---|---|
| Mô hình tên miền v2: gấp đôi dữ liệu (1,1 triệu mẫu, thêm Majestic + Umbrella) | Báo nhầm giảm một nửa, nhưng bắt lừa đảo kém hơn | Toàn hệ thống 96,9%, thấp hơn bản v1 (97,2%) |
| Mô hình nội dung + 4.010 trang hợp pháp thật | Báo nhầm giảm từ 27 xuống 2 | Bắt cờ bạc sụp từ 10/11 xuống 1–2/11: mô hình học đường tắt "trang thật = an toàn" vì không có trang lừa đảo thật để cân bằng |

**Hướng cải thiện:** tích luỹ trang lừa đảo thật mỗi ngày bằng `collect-pages.ts`, rồi huấn luyện lại khi đã có đủ cả hai nhãn.
