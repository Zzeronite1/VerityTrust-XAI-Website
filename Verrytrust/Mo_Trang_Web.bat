@echo off
chcp 65001 >nul
title Nền tảng Verity AI - XAI Safety & Transparency
cd /d "%~dp0"

echo ===================================================================
echo     VERITY AI - THẨM ĐỊNH AN TOÀN, MINH BẠCH & PHÁP LÝ (XAI)
echo ===================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Đã phát hiện Node.js trên hệ thống.
    if not exist "node_modules" (
        echo [*] Đang cài đặt thư viện cần thiết (npm install)...
        call npm install
    )
    echo [*] Đang khởi động máy chủ Verity XAI Server (Vite + Express)...
    start "Verity Server" cmd /c "npm run dev"
    echo [*] Đang mở trình duyệt kết nối vào hệ thống tại http://localhost:3000...
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
) else (
    echo [!] Máy tính chưa cài đặt Node.js.
    echo [*] Đang tự động mở Phiên bản Độc lập (Standalone Demo Offline)...
    timeout /t 2 /nobreak >nul
    start "" "%~dp0standalone_demo.html"
)
exit
