# QUY TẮC PHÁT TRIỂN & ĐỒNG BỘ MÃ NGUỒN (VERITY TRUST XAI)

## 1. Tự động đồng bộ Git sau mỗi lần làm việc (Mandatory Git Sync Rule)
- Sau **MỖI LẦN** hoàn thành chỉnh sửa code, thêm tính năng, sửa lỗi hoặc tối ưu hóa theo yêu cầu của người dùng:
  - BẮT BUỘC phải tự động kiểm tra `git status`.
  - Tự động thêm toàn bộ thay đổi: `git add -A` (hoặc các file liên quan, ngoại trừ file nhạy cảm như `.env`).
  - Tự động commit với thông điệp chuẩn mực quy chuẩn Conventional Commits (ví dụ: `feat: ...`, `fix: ...`, `perf: ...`).
  - Tự động push trực tiếp lên nhánh chính: `git push origin main`.
- Tuyệt đối không để sót file chưa commit hoặc chưa push lên GitHub khi kết thúc lượt phản hồi cho người dùng.

## 2. Bảo mật môi trường
- Không bao giờ commit file chứa bí mật API key thật (`.env`).
- Chỉ commit `.env.example` hoặc các file mã nguồn công khai.
