# 🔌 Đặc tả Giao diện Lập trình Ứng dụng (API Specification)

## Base URL
Mặc định: `http://localhost:3000` (hoặc URL môi trường triển khai thực tế).

---

## 1. POST /api/scan
Thực hiện thẩm định an toàn, minh bạch và pháp lý cho một thực thể số.

### Request Headers
- `Content-Type: application/json`

### Request Body
```json
{
  "targetType": "url", // "url" | "document" | "text" | "image"
  "targetValue": "https://example.com",
  "targetTitle": "Example Official Portal",
  "fileData": "data:image/png;base64,...", // Tùy chọn (cho image/document)
  "mimeType": "image/png",                 // Tùy chọn
  "persona": "consumer",                   // "consumer" | "business" | "legal"
  "engineMode": "deep",                    // "deep" | "simplified"
  "lang": "vi",                            // Mã ngôn ngữ (VD: "vi", "en", "ja",...)
  "userBirthYear": 2005                    // Tùy chọn: Năm sinh người dùng
}
```

### Response (200 OK)
```json
{
  "id": "scan_1730389000000",
  "targetTitle": "Example Official Portal",
  "targetType": "url",
  "trustScore": 94,
  "status": "safe",
  "safetyScore": 96,
  "transparencyScore": 92,
  "legalityScore": 94,
  "summary": "XÁC NHẬN AN TOÀN: Thực thể số có hạ tầng mã hóa TLS đạt chuẩn...",
  "keyFindings": [
    {
      "title": "Chứng chỉ TLS 1.3 bảo mật cao",
      "category": "safety",
      "severity": "safe",
      "explanation": "Chứng chỉ số hợp lệ, mã hóa AES-256 mạnh mẽ.",
      "impact": "+15 safety points"
    }
  ],
  "technicalMetrics": {
    "engine": "Deep Multimodal XAI Engine (LLM-Grounded)",
    "totalLatencyMs": 420,
    "slaMet": true,
    "dnsLookupMs": 14,
    "tlsHandshakeMs": 45,
    "tlsVersion": "TLSv1.3",
    "certIssuer": "DigiCert Global Root G2",
    "hstsEnabled": true,
    "cspEnabled": true
  },
  "nationalCompliance": {
    "vietnamCompliance": {
      "status": "compliant",
      "lawReferences": ["Luật An ninh mạng 2018", "Nghị định 13/2023/NĐ-CP"],
      "firewallStatus": "allowed",
      "details": "Tuân thủ toàn diện các quy định bảo vệ an toàn thông tin."
    }
  },
  "ageAppropriateness": {
    "minimumAge": 0,
    "ratingCode": "ALL",
    "ratingLabel": "Mọi lứa tuổi (All Ages)"
  }
}
```

---

## 2. POST /api/feedback
Ghi nhận phản hồi của người dùng về kết quả thẩm định (False Positive / False Negative).

### Request Body
```json
{
  "scanId": "scan_1730389000000",
  "feedbackType": "false_positive", // "false_positive" | "false_negative" | "general"
  "comment": "Trang web này là cổng tin tức chính thống của địa phương",
  "userEmail": "user@example.com"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Phản hồi đã được ghi nhận vào hệ thống Verity XAI."
}
```

---

## 3. POST /api/translate-report
Dịch nhanh toàn bộ đối tượng báo cáo thẩm định sang ngôn ngữ mới.

### Request Body
```json
{
  "report": { ... },
  "targetLang": "English"
}
```

### Response (200 OK)
Đối tượng `ScanReport` hoàn chỉnh đã được dịch sang ngôn ngữ đích.
