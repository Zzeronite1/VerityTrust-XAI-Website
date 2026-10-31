<div align="center">

# 🛡️ VerityTrust (Verity AI)
### Nền tảng Thẩm định An toàn, Minh bạch & Tuân thủ Pháp lý số (Explainable AI - XAI)
*Web Safety, Transparency & Statutory Legal Compliance Audit Platform with Browser Extensions*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-green.svg)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-orange.svg)](https://ai.google.dev/)
[![Manifest V3](https://img.shields.io/badge/Extension-Manifest_V3-yellow.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

</div>

---

## 📖 Mục lục (Table of Contents)
1. [Giới thiệu Dự án](#-giới-thiệu-dự-án)
2. [Kiến trúc & Động cơ Thẩm định](#-kiến-trúc--động-cơ-thẩm-định)
3. [Khung Pháp lý & Quy chuẩn Tích hợp](#-khung-pháp-lý--quy-chuẩn-tích-hợp)
4. [Tính năng Nổi bật](#-tính-năng-nổi-bật)
5. [Hướng dẫn Khởi chạy Nhanh (Quick Start)](#-hướng-dẫn-khởi-chạy-nhanh-quick-start)
6. [Cài đặt Tiện ích Mở rộng (Browser Extensions)](#-cài-đặt-tiện-ích-mở-rộng-browser-extensions)
7. [Tài liệu Kỹ thuật Chi tiết](#-tài-liệu-kỹ-thuật-chi-tiết)

---

## 🌟 Giới thiệu Dự án

**VerityTrust (Verity AI)** là một nền tảng thẩm định độc lập áp dụng nguyên lý **Explainable AI (XAI)** nhằm bảo vệ người dùng, doanh nghiệp và bộ phận pháp chế trước các rủi ro không gian mạng:
- **Độ an toàn kỹ thuật (Safety):** Phát hiện bẫy lừa đảo (phishing), mạo danh ngân hàng/thương hiệu, kiểm tra hạ tầng DNS/TLS thực tế và rò rỉ dữ liệu.
- **Tính minh bạch (Transparency):** Thẩm định nguồn gốc tên miền, danh tính pháp nhân, bẫy hợp đồng điều khoản sử dụng (ToS traps), xung đột lợi ích.
- **Tính hợp pháp & Tuân thủ pháp luật (Legality):** Đối chiếu các khung pháp lý an ninh mạng và hình sự tại Việt Nam và Quốc tế.

---

## 🏗️ Kiến trúc & Động cơ Thẩm định

Dự án vận hành trên kiến trúc **Client-Server đồng bộ**:

```
                              ┌───────────────────────────────────┐
                              │  Verity React 19 Frontend (SPA)   │
                              │  (Scanner, Gauges, HUD Telemetry) │
                              └─────────────────┬─────────────────┘
                                                │ POST /api/scan
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Verity Express Backend Engine                         │
│                                                                                 │
│   ┌──────────────────────────┐                   ┌──────────────────────────┐   │
│   │ Real-time Network Probes │                   │ Dynamic Memory Caching   │   │
│   │ • node:dns (NXDOMAIN)    │                   │ • SHA-256 Fingerprint    │   │
│   │ • node:tls (X.509 cert)  │                   │ • SSRF Protection Gate   │   │
│   │ • HTTP Security Headers  │                   │ • LRU Bounded Cache      │   │
│   └─────────────┬────────────┘                   └─────────────┬────────────┘   │
│                 │                                              │                │
│                 └───────────────────────┬──────────────────────┘                │
│                                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                      DUAL-ENGINE VERIFICATION CORE                      │   │
│   │                                                                         │   │
│   │   [Chế độ 1: Deep AI Reasoning]       [Chế độ 2: Simplified Heuristic]  │   │
│   │   • Model: gemini-3.8-flash           • Sub-100ms Ultra-fast Matrix     │   │
│   │   • Multimodal (URL, Doc, Img)        • Offline / Zero-API-Key Fallback │   │
│   │   • Natural Language Reasoning        • Statutory Penalty Gates         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Khung Pháp lý & Quy chuẩn Tích hợp

VerityTrust tích hợp ma trận đối chiếu pháp luật chuyên sâu:

### 1. Pháp luật Việt Nam
- **Bộ luật Hình sự số 100/2015/QH13:**
  - *Điều 321 (Tội đánh bạc)* & *Điều 322 (Tội tổ chức đánh bạc hoặc gá bạc)*: Tự động kích hoạt cơ chế **Penalty Gate** (khóa trần điểm tin cậy $\le 15/100$) đối với các tên miền cờ bạc, cá độ trái phép.
- **Luật An ninh mạng số 24/2018/QH14:**
  - *Điều 8 (Các hành vi bị nghiêm cấm trên không gian mạng)* & *Điều 18 (Phòng, chống hành vi sử dụng không gian mạng xâm phạm an ninh quốc gia, trật tự an toàn xã hội)*.
- **Nghị định 13/2023/NĐ-CP:** Rà soát nghĩa vụ bảo vệ dữ liệu cá nhân, quyền chủ thể dữ liệu và chuyển dữ liệu xuyên biên giới.
- **Luật Trẻ em 2016 & Nghị định 147/2024/NĐ-CP:** Phân loại ngưỡng độ tuổi tiếp cận nội dung số (All Ages, 13+, 16+, 18+).

### 2. Quy chuẩn Quốc tế
- **Hoa Kỳ:** *Computer Fraud and Abuse Act (CFAA, 18 U.S.C. § 1030)* theo tiền lệ *Van Buren v. United States* (thu thập thụ động siêu dữ liệu công khai); *Unlawful Internet Gambling Enforcement Act (UIGEA, 31 U.S.C. § 5361)*.
- **Liên minh Châu Âu:** *Chỉ thị NIS2 (Directive (EU) 2022/2555)* và *Quy chế Bảo vệ Dữ liệu Chung (GDPR, Regulation (EU) 2016/679)*.

---

## 🚀 Tính năng Nổi bật

1. **Thẩm định Đa phương thức (Multimodal Input):** Quét URL website, trích xuất điều khoản tài liệu pháp lý (PDF/Word/Text), phân tích ảnh chụp màn hình bằng chứng số.
2. **Explainable AI (XAI) Matrix:** Trọng số tính toán công khai:
   $$\text{Trust Score} = (\text{Safety} \times 0.40) + (\text{Transparency} \times 0.30) + (\text{Legality} \times 0.30)$$
3. **Trình tạo Extension Tức thì (Dynamic Extension Generator):** Đóng gói tiện ích mở rộng Chrome Manifest V3 và Firefox Add-on thành tệp `.zip` trực tiếp trên trình duyệt bằng thư viện `JSZip`.
4. **Hệ thống Đa ngôn ngữ (i18n):** Hỗ trợ 259 ngôn ngữ với bộ từ điển hơn 6,500 dòng code. Báo cáo chuyển đổi ngôn ngữ phản xạ ngay lập tức trong 0ms.
5. **Phân quyền Tổ chức (RBAC):** Quản lý vai trò `owner`, `admin`, `member`, `viewer`, hỗ trợ đánh dấu báo cáo nhạy cảm và nhật ký kiểm toán (Audit Logs) bất biến.

---

## 💻 Hướng dẫn Khởi chạy Nhanh (Quick Start)

### Yêu cầu Tiên quyết
- **Node.js** phiên bản 18 trở lên (`node -v`).
- Trình quản lý gói `npm`, `yarn` hoặc `bun`.

### Các bước Cài đặt & Chạy

1. **Di chuyển vào thư mục dự án:**
   ```bash
   cd Verrytrust
   ```

2. **Cài đặt thư viện phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   Tạo file `.env.local` từ mẫu:
   ```bash
   cp .env.example .env.local
   ```
   *(Tùy chọn: Nhập `GEMINI_API_KEY` của bạn từ [Google AI Studio](https://aistudio.google.com/apikey). Nếu để trống, hệ thống sẽ tự động dùng động cơ Heuristic & Real-time Network Probe).*

4. **Khởi chạy ứng dụng:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt truy cập: **`http://localhost:3000`**

### Khởi chạy 1-Click (Không cần gõ lệnh)
- **Trên Windows:** Nhấp đúp vào tệp [`Mo_Trang_Web.bat`](Mo_Trang_Web.bat)
- **Trên macOS / Linux:** Mở terminal chạy:
  ```bash
  chmod +x run.sh && ./run.sh
  ```

> **Ghi chú về Phiên bản Standalone Demo:**
> Nếu bạn muốn xem bản demo tĩnh offline không cần cài đặt Node.js, bạn có thể mở trực tiếp file [`standalone_demo.html`](standalone_demo.html) bằng bất kỳ trình duyệt nào.

---

## 🧩 Cài đặt Tiện ích Mở rộng (Browser Extensions)

Bạn có thể tải gói cài đặt tiện ích mở rộng trực tiếp từ giao diện web (nhấp vào nút **Extension** trên thanh menu):

### Hướng dẫn cài trên Google Chrome / Edge / Brave (Manifest V3)
1. Tải tệp `verity-chrome-extension.zip` từ trang web và giải nén ra một thư mục.
2. Mở trình duyệt, truy cập địa chỉ: `chrome://extensions/`
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Nhấp nút **Tải tiện ích đã giải nén (Load unpacked)** và chọn thư mục vừa giải nén.
5. Nhấp chuột phải vào bất kỳ liên kết hoặc trang web nào để thẩm định an toàn tức thì.

### Hướng dẫn cài trên Mozilla Firefox
1. Tải tệp `verity-firefox-extension.zip` và giải nén.
2. Mở Firefox, truy cập: `about:debugging#/runtime/this-firefox`
3. Nhấp nút **Tải phần bổ trợ tạm thời... (Load Temporary Add-on...)**.
4. Chọn tệp `manifest.json` trong thư mục vừa giải nén.

---

## 📚 Tài liệu Kỹ thuật Chi tiết

- [Kiến trúc Hệ thống Toàn diện (Architecture Guide)](docs/ARCHITECTURE.md)
- [Đặc tả Giao diện Lập trình Ứng dụng (API Specification)](docs/API_SPEC.md)
- [Ma trận Tuân thủ Pháp luật & Quy chuẩn An toàn (Legal Matrix)](docs/LEGAL_COMPLIANCE.md)

---

## 📄 Bản quyền & Đóng góp (License & Contribution)
Dự án được phát triển theo giấy phép mở dành cho cộng đồng an ninh mạng và nghiên cứu XAI. Mọi đóng góp (Pull Request, Bug Report) đều được hoan nghênh.
