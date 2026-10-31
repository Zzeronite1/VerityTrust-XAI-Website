#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================================="
echo "    VERITY AI - THẨM ĐỊNH AN TOÀN, MINH BẠCH & PHÁP LÝ (XAI)"
echo "==================================================================="
echo ""

if command -v node >/dev/null 2>&1; then
    echo "[OK] Đã phát hiện Node.js."
    if [ ! -d "node_modules" ]; then
        echo "[*] Đang cài đặt thư viện (npm install)..."
        npm install
    fi
    echo "[*] Đang khởi động Verity XAI Server..."
    npm run dev &
    SERVER_PID=$!
    sleep 3
    if command -v open >/dev/null 2>&1; then
        open http://localhost:3000
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open http://localhost:3000
    fi
    wait $SERVER_PID
else
    echo "[!] Chưa cài đặt Node.js. Đang mở phiên bản Standalone Demo..."
    if command -v open >/dev/null 2>&1; then
        open ./standalone_demo.html
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open ./standalone_demo.html
    fi
fi
