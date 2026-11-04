# 🛡️ VERITY – NỀN TẢNG THẨM ĐỊNH TÍNH MINH BẠCH, AN TOÀN SỐ & PHÁP LÝ WEBSITE

> **Verity** là giải pháp ứng dụng **Trí tuệ Nhân tạo Giải thích được (Explainable AI - XAI)** kết hợp mô hình ngôn ngữ lớn **Google Gemini AI** nhằm tự động bóc tách, đánh giá độ an toàn, tính minh bạch và mức độ tuân thủ pháp lý cho bất kỳ website, liên kết số, cổng thanh toán hoặc tài liệu điều khoản dịch vụ (Terms of Service - ToS) nào.

---

## 📌 MỤC LỤC
1. [Điểm khác biệt cốt lõi (Core Differentiators)](#1-điểm-khác-biệt-cốt-lõi)
2. [Nguyên lý chấm điểm tin cậy (Trust Score Algorithm)](#2-nguyên-lý-chấm-điểm-tin-cậy)
3. [Cơ chế chốt chặn vi phạm nghiêm trọng (Penalty Gate)](#3-cơ-chế-chốt-chặn-vi-phạm-nghiêm-trọng)
4. [Kiến trúc hệ thống & Cách thức hoạt động](#4-kiến-trúc-hệ-thống--cách-thức-hoạt-động)
5. [Các tính năng nổi bật](#5-các-tính-năng-nổi-bật)
6. [Căn cứ pháp lý & Chuẩn đối chiếu](#6-căn-cứ-pháp-lý--chuẩn-đối-chiếu)
7. [Hướng dẫn cài đặt & Khởi động nhanh](#7-hướng-dẫn-cài-đặt--khởi-động-nhanh)
8. [Cấu trúc mã nguồn](#8-cấu-trúc-mã-nguồn)

---

## 1. ĐIỂM KHÁC BIỆT CỐT LÕI

Phần lớn các công cụ kiểm tra URL trên thị trường hiện nay hoạt động như một **"Hộp đen" (Black Box)**:
* Chỉ trả về kết quả cụt lủn: *"An toàn"* hoặc *"Nguy hiểm"*.
* Người dùng không biết **vì sao** trang web đó bị đánh giá nguy hiểm.
* Dễ bị qua mặt bởi các trang web cờ bạc lậu hoặc lừa đảo có chứng chỉ SSL/HTTPS xịn.

👉 **Verity giải quyết triệt để vấn đề này bằng mô hình XAI (Explainable AI):**
* **Không hộp đen:** Phân tách điểm số thành các trụ cột độc lập.
* **Bằng chứng xác thực (Evidence-grounded):** Trích dẫn nguyên văn câu chữ, nút bấm hoặc điều khoản ToS độc hại từ trang web làm bằng chứng.
* **Đọc nội dung thực tế:** Không chỉ kiểm tra tên miền hời hợt mà tải trực tiếp nội dung HTML, bóc tách văn bản để xem website **đang thực sự làm gì**.

---

## 2. NGUYÊN LÝ CHẤM ĐIỂM TIN CẬY (TRUST SCORE 0 – 100)

### 📊 Thang đo tiêu chuẩn:
* **80 – 100 (Safe - Xanh lá):** Đạt chuẩn an toàn cao, danh tính rõ ràng, minh bạch pháp lý và bảo vệ dữ liệu tốt.
* **50 – 79 (Warning - Vàng):** Cần thận trọng; có một số điều khoản mập mờ, thiếu chứng chỉ bảo mật cao cấp hoặc thu thập dữ liệu bất thường.
* **0 – 49 (Dangerous - Đỏ):** Cảnh báo nguy hiểm; dấu hiệu lừa đảo (phishing), cờ bạc/cá cược trái phép, phát tán mã độc.

---

### ⚖️ Công thức tính điểm 3 trụ cột:

$$\text{Trust Score} = (\text{Điểm An toàn Kỹ thuật} \times 40\%) + (\text{Điểm Minh bạch Nội dung} \times 30\%) + (\text{Điểm Tuân thủ Pháp lý} \times 30\%)$$

#### 🛡️ Trụ cột 1: Độ An toàn Kỹ thuật (Safety Score - 40%)
* **Bảo mật đường truyền:** Kiểm tra giao thức HTTPS, tính hợp lệ của chứng thư TLS 1.3 và cơ quan cấp chứng chỉ (CA).
* **Hạ tầng mạng:** Quét bản ghi DNS, IP máy chủ và nhận diện các đuôi mở rộng có mức độ rủi ro cao (TLD lạm dụng lừa đảo).
* **Phát hiện giả mạo (Anti-Phishing):** Nhận diện hành vi nhái giao diện ngân hàng, sàn thương mại điện tử nhằm chiếm đoạt tài khoản.

#### 👁️ Trụ cột 2: Tính Minh bạch Nội dung & Nguồn gốc (Transparency Score - 30%)
* **Xác thực chủ thể:** Kiểm tra thông tin pháp nhân sở hữu, mã số thuế, địa chỉ văn phòng thực tế và kênh liên hệ hỗ trợ.
* **Minh bạch chính sách:** Rà soát bảng giá, chính sách hoàn tiền, hủy dịch vụ; phát hiện bẫy phí ẩn (Dark Patterns).
* **Kiểm định tin tức:** Nhận diện thông tin sai sự thật, giật gân, lôi kéo người dùng chuyển tiền hoặc cung cấp OTP.

#### ⚖️ Trụ cột 3: Tuân thủ Pháp lý & Dữ liệu Cá nhân (Legality Score - 30%)
* **Nghị định 13/2023/NĐ-CP & GDPR:** Đánh giá quy trình xin chấp thuận của chủ thể trước khi thu thập dữ liệu cá nhân.
* **Rà soát điều khoản hợp đồng điện tử (ToS Review):** Phát hiện các "bẫy chữ nhỏ" như: tự ý bán dữ liệu người dùng cho bên thứ ba, miễn trừ trách nhiệm tài chính vô lý, tước bỏ quyền khiếu nại tại Tòa án.

---

## 3. CƠ CHẾ CHỐT CHẶN VI PHẠM NGHIÊM TRỌNG (PENALTY GATE)

> **Quy tắc vàng:** *Một website dù có chứng chỉ SSL/TLS hoàn hảo, hạ tầng máy chủ mạnh mẽ đến đâu, nhưng nếu vi phạm các điều cấm của pháp luật thì điểm số kỹ thuật KHÔNG THỂ cứu vãn điểm số tổng hợp.*

Hệ thống kích hoạt **Penalty Gate** để **khóa điểm ngay lập tức về $\le 15$ điểm (Báo động Đỏ - Nguy hiểm)** khi phát hiện các hành vi:
1. **Cờ bạc, cá cược, sòng bài trực tuyến (Casino/Game bài):** Vi phạm Điều 321, 322 Bộ luật Hình sự & Điều 8 Luật An ninh mạng.
2. **Chiến dịch Phishing / Đánh cắp mã OTP:** Giả mạo cổng thanh toán ngân hàng, ví điện tử để chiếm đoạt tài sản.
3. **Phát tán mã độc (Malware / Ransomware):** Tệp tin cài đặt ẩn danh, đánh cắp dữ liệu người dùng.

---

## 4. KIẾN TRÚC HỆ THỐNG & CÁCH THỨC HOẠT ĐỘNG

Dự án được xây dựng theo kiến trúc **Client - Server chuẩn mực**, đảm bảo an toàn tuyệt đối cho API Key và tránh triệt để lỗi CORS:

```
[TRÌNH DUYỆT (Frontend: index.html)]
          │
          │ Gửi URL cần quét qua: POST /api/analyze
          ▼
[EXPRESS BACKEND (server.ts)]
          │
          ├─► 1. CÀO DỮ LIỆU THỰC TẾ (Deep Content Fetcher)
          │      Tải mã nguồn HTML, bóc tách:
          │      - Tiêu đề trang (<title>)
          │      - Thẻ mô tả (<meta description>, <keywords>)
          │      - Văn bản bài viết, dịch vụ, các nút thao tác chính
          │
          ├─► 2. BỘ NÃO SUY LUẬN GEMINI AI
          │      Gửi toàn bộ văn bản thực tế tới Gemini AI (gemini-3.5-flash-lite / gemini-3.8-flash)
          │      với vai trò Chuyên gia Giám định An ninh mạng.
          │      Gemini đọc hiểu ngữ nghĩa, chấm điểm và trích xuất bằng chứng (Red Flags).
          │
          ├─► 3. CHỐT CHẶN BẢO VỆ PHÁP LÝ (Deterministic Guardrail)
          │      Đối chiếu chéo với danh mục pháp luật Việt Nam (Cờ bạc lậu, giả mạo...).
          │      Kích hoạt Penalty Gate nếu vi phạm.
          │
          ▼
[KẾT QUẢ JSON TRẢ VỀ CHO CLIENT]
  • trust_score: Điểm tin cậy (0 - 100)
  • status: Trạng thái (Safe / Warning / Dangerous)
  • summary: Tóm tắt nhận định của chuyên gia
  • red_flags: Danh sách bằng chứng rủi ro phát hiện được
  • recommendations: Lời khuyên hành động an toàn cho người dùng
```

---

## 5. CÁC TÍNH NĂNG NỔI BẬT

* ⚡ **Giao diện Cyberpunk / Sci-Fi hiện đại:** Mạng lưới hạt tương tác Canvas, hiệu ứng rèm quét Laser, thanh sóng âm Telemetry và vòng hiển thị điểm số SVG chuyển động trực quan.
* 🔍 **Phân tích theo nội dung thực tế:** Không đánh giá hời hợt qua tên miền; bóc tách ngữ nghĩa những gì website thực sự cung cấp.
* 📑 **Báo cáo giải thích minh bạch:** Liệt kê rõ ràng danh sách rủi ro (Red Flags) đi kèm lời khuyên hành động cụ thể.
* 🛡️ **Bảo mật API Key tuyệt đối:** Không bao giờ để lộ Gemini API Key ở phía giao diện người dùng; toàn bộ quá trình giao tiếp AI diễn ra khép kín ở máy chủ Backend.
* 🔄 **Cơ chế dự phòng tự động (Auto-Fallback Engine):** Hệ thống không bao giờ bị sập hay báo lỗi đỏ nếu đường truyền AI gặp sự cố.

---

## 6. CĂN CỨ PHÁP LÝ & CHUẨN ĐỐI CHIẾU

* **Luật An ninh mạng số 24/2018/QH14:** Điều 8 (Các hành vi bị nghiêm cấm trên không gian mạng), Điều 18 (Phòng chống hành vi chiếm đoạt tài sản qua mạng).
* **Bộ luật Hình sự số 100/2015/QH13:** Điều 321 (Tội đánh bạc trái phép), Điều 322 (Tội tổ chức đánh bạc hoặc gá bạc).
* **Nghị định 13/2023/NĐ-CP:** Bảo vệ dữ liệu cá nhân, quyền của chủ thể dữ liệu và nghĩa vụ bên xử lý dữ liệu.
* **Quy định Quốc tế tham chiếu:** GDPR (Quy định chung về bảo vệ dữ liệu Liên minh Châu Âu), NIS2 Directive và chuẩn bảo mật RFC TLS 1.3.

---

## 7. HƯỚNG DẪN CÀI ĐẶT & KHỞI ĐỘNG NHANH

### Yêu cầu môi trường:
* Đã cài đặt **Node.js** (phiên bản 18 trở lên).

### Bước 1: Thiết lập biến môi trường
Mở file `.env` trong thư mục gốc và dán mã API Key của bạn (lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey)):
```env
GEMINI_API_KEY="AIzaSy...your-gemini-api-key..."
APP_URL="http://localhost:3000"
```

### Bước 2: Cài đặt các thư viện cần thiết
Mở Terminal/Command Prompt trong thư mục dự án và chạy:
```powershell
npm install --legacy-peer-deps
```

### Bước 3: Khởi động máy chủ
```powershell
npm run dev
```

Khi Terminal xuất hiện thông báo:
```text
Verity platform server listening on http://0.0.0.0:3000
```

### Bước 4: Trải nghiệm ứng dụng
Mở trình duyệt web bất kỳ (Chrome/Edge/Firefox) và truy cập:
👉 **http://localhost:3000**

---

## 8. CẤU TRÚC MÃ NGUỒN

```text
├── index.html                 # Giao diện Frontend độc lập (Tailwind CSS, Canvas HUD)
├── server.ts                  # Máy chủ Express, Cào HTML & Tích hợp Google Gemini AI
├── package.json               # Cấu hình gói phụ thuộc và scripts khởi động
├── .env                       # Lưu trữ biến môi trường bí mật (GEMINI_API_KEY)
├── .env.example               # File mẫu biến môi trường tham khảo
├── src/                       # Mã nguồn mở rộng (Types, Context, Components)
└── README.md                  # Tài liệu hướng dẫn và thuyết minh dự án
```

---
*Dự án Verity – Phát triển nhằm mục tiêu xây dựng một không gian mạng minh bạch, lành mạnh và an toàn cho cộng đồng.*
