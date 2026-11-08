# Cách tính điểm tin cậy

[← Về README](../README.md)

Điểm tin cậy được tính **hoàn toàn từ bằng chứng**, không có "hộp đen". Mỗi bằng chứng tìm thấy cộng hoặc trừ một số điểm cố định, và tất cả đều hiện trong kết quả (`score_breakdown`, `red_flags`), nên ai cũng kiểm tra lại được.

Mã nguồn: [`server/riskScoring.ts`](../server/riskScoring.ts).

## Ba bước

```text
1. Bắt đầu từ 70 điểm
2. Cộng/trừ điểm cho từng bằng chứng, rồi giới hạn trong khoảng 0–100
3. Áp TRẦN (nếu có bằng chứng nghiêm trọng) hoặc SÀN (nếu là tổ chức đã xác thực)
```

| Điểm | Kết luận | Màu |
|---|---|---|
| **75 – 100** | `Safe` — An toàn | 🟢 |
| **50 – 74** | `Warning` — Cần thận trọng | 🟡 |
| **0 – 49** | `Dangerous` — Nguy hiểm | 🔴 |

### Trần điểm (bằng chứng nghiêm trọng)

Một số bằng chứng đủ nặng để kết luận nguy hiểm, **bất kể có bao nhiêu điểm cộng**. Ví dụ: web cờ bạc có chứng chỉ TLS xịn và tên miền 10 năm tuổi vẫn bị giữ ở mức nguy hiểm.

| Bằng chứng | Điểm tối đa |
|---|---|
| Có trong danh sách đen lừa đảo/mã độc | 8 |
| Cờ bạc / cá cược trực tuyến | 12 |
| Giả danh thương hiệu + có ô mật khẩu/OTP; favicon giả; gửi dữ liệu qua Telegram bot | 15 |
| Tên miền trỏ về IP nội bộ | 15 |
| Form đăng nhập dạng ảnh (né bộ quét văn bản) | 20 |
| Tên miền không tồn tại | 20 |
| Mô hình nội dung báo rủi ro rất cao (≥ 92%), trang không có thông tin pháp lý | 35 |

### Sàn điểm (tổ chức đã xác thực)

| Trường hợp | Điểm tối thiểu |
|---|---|
| Tên miền chính thống (ngân hàng, cơ quan nhà nước, sàn TMĐT lớn…) | 90 |
| Trang chính chủ của tổ chức lớn trên nền tảng (vd `github.com/microsoft`) | 80 |
| Doanh nghiệp minh bạch: có logo Bộ Công Thương hoặc mã số thuế, không có dấu hiệu mạo danh | 75 |
| Doanh nghiệp có đủ liên hệ và chính sách, không có dấu hiệu mạo danh | 65 |

Nếu đã có trần thì sàn không áp dụng: trần luôn thắng.

---

## Bảng bằng chứng chính

### Danh tiếng & tên miền

| Bằng chứng | Điểm |
|---|---|
| Tên miền chính thống đã xác thực | +20 |
| Phổ biến: top 1.000 / 10.000 / 100.000 / 200.000 Tranco | +25 / +20 / +14 / +8 |
| Tên miền hoạt động trên 10 năm / trên 3 năm | +12 / +8 |
| Tên miền dưới 30 ngày / dưới 6 tháng / dưới 1 năm | −35 / −22 / −10 |
| Tên miền chứa tên thương hiệu nhưng không phải tên miền chính thức (`vietcombank-xacthuc.com`) | −40 |
| Tên miền nhái thương hiệu (`vietcornbank`, `paypa1`, ký tự trông giống nhau) | −40 |
| Tên thương hiệu nằm trong đường dẫn (`/paypal/login`) | −20 |
| Subdomain trên hosting miễn phí (`xyz.vercel.app`, `abc.pages.dev`…) | −20 |
| Dùng thẳng địa chỉ IP thay cho tên miền | −25 |
| Tên miền toàn số / chuỗi ký tự ngẫu nhiên | −25 / −15 |
| Đuôi tên miền hay bị lạm dụng (`.top`, `.xyz`, `.click`…) | −12 |
| Tên miền quốc tế hoá (IDN, có thể giả ký tự) | −15 |
| Mô hình học sâu: tên miền giống lừa đảo (≥ 95% / ≥ 85%) | −20 / −12 |

### Kết nối

| Bằng chứng | Điểm |
|---|---|
| Chứng chỉ TLS hợp lệ / có HSTS | +4 / +2 |
| Không dùng HTTPS | −12 |
| Chứng chỉ vừa được cấp | −6 |
| Chuyển hướng sang tên miền khác / chuyển hướng bằng JavaScript | −8 / −10 |
| Cổng lạ (không phải 80/443) | −10 |

### Nội dung trang

Chỉ áp dụng cho web không phổ biến và không chính thống, vì web lớn đương nhiên có form đăng nhập.

| Bằng chứng | Điểm |
|---|---|
| Hoạt động cờ bạc (tên miền, đường dẫn hoặc nội dung) | −60 |
| Gửi dữ liệu người dùng qua Telegram bot / webhook | −45 |
| Giả danh thương hiệu: nhắc tới thương hiệu lớn + đòi đăng nhập trên tên miền lạ | −35 |
| Favicon là logo của thương hiệu khác | −35 |
| Giả mạo trang đăng nhập ngân hàng | −35 |
| Giả danh hỗ trợ Meta/Facebook ("tài khoản sắp bị khoá") | −30 |
| Giả danh ví tiền điện tử (MetaMask, Trust Wallet…) | −30 |
| Ô nhập cực kỳ nhạy cảm: OTP, số thẻ, CVV, cụm từ khôi phục ví | −25 |
| Form đăng nhập dạng ảnh | −25 |
| Mô hình học sâu đọc nội dung: rủi ro ≥ 92% / ≥ 90% / ≥ 82% | −25 / −15 / −8 |
| Từ khoá lừa đảo ("xác minh tài khoản", "tài khoản bị khoá"…) | −20 |
| Trúng thưởng / quà tặng | −20 |
| Đầu tư / cho vay không có giấy phép | −20 |
| Form gửi dữ liệu sang tên miền khác | −20 |
| Nút tải ứng dụng giả | −15 |
| Ô mật khẩu trên tên miền chưa xác minh | −12 |
| Mã JavaScript bị làm rối (eval/atob/packer) | −12 |
| Trang chặn bot (Cloudflare challenge) | −12 |
| Trang gần như chỉ có form / nhiều liên kết rỗng / đường dẫn kiểu `/login` | −8 |
| Logo Bộ Công Thương / mã số thuế / liên hệ + chính sách đầy đủ | cộng điểm minh bạch |
| Khiên doanh nghiệp minh bạch | +10 |

---

## Tránh báo nhầm web hợp pháp

Phần lớn công sức tinh chỉnh dành cho việc **không oan** web thật. Một số quy tắc quan trọng:

- **Thương hiệu được nhắc tự nhiên thì không tính là giả danh.** Bỏ qua thương hiệu nằm trong:
  - nút "Đăng nhập với Google/Facebook/Apple";
  - link Google Play / App Store, dòng chữ reCAPTCHA của Google;
  - icon mạng xã hội (`[fa-facebook-f]`), đường dẫn trong link;
  - cụm "đại lý chính hãng / authorized reseller".
- **Web lâu năm** (trên 3 năm): chỉ xét thương hiệu xuất hiện ở tiêu đề và mô tả, tránh oan shop ghi "chuyển khoản Vietcombank".
- **Favicon:** chỉ tính giả mạo khi tên thương hiệu nằm trong đường dẫn file favicon, không tính khi favicon chỉ được lưu trên CDN chung (Google, Cloudflare, GitHub…).
- **Thương hiệu chỉ có trong thân trang:** phải đi kèm ô mật khẩu hoặc ô nhạy cảm thật mới tính giả danh.

## Đọc kết quả

```json
{
  "trust_score": 15,
  "status": "Dangerous",
  "red_flags": [
    "Giả danh thương hiệu vietcombank: Trang nhắc tới thương hiệu lớn và yêu cầu đăng nhập/xác minh…",
    "Có ô nhập mật khẩu trên tên miền chưa xác minh: …"
  ],
  "score_breakdown": {
    "evidence_score": 15,
    "verdict": "phishing",
    "evidence_completeness": 80,
    "factors": [
      { "id": "brand_impersonation", "delta": -35, "label": "Giả danh thương hiệu vietcombank", "detail": "…" },
      { "id": "password_form", "delta": -12, "label": "Có ô nhập mật khẩu trên tên miền chưa xác minh", "detail": "…" }
    ]
  }
}
```

- `factors`: danh sách bằng chứng; `delta` là số điểm cộng (+) hoặc trừ (−).
- `verdict`: loại kết luận — `trusted`, `legit`, `unknown`, `suspicious`, `phishing`, `gambling`, `malicious`, `unreachable`.
- `evidence_completeness`: tỷ lệ phần trăm các nguồn bằng chứng thu thập được (DNS, TLS, nội dung, tuổi tên miền, độ phổ biến). Con số thấp nghĩa là kết luận dựa trên ít dữ liệu hơn.
