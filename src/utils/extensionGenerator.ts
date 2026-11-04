import JSZip from 'jszip';

export function getChromeExtensionFiles(platformBaseUrl: string, lang = 'vi') {
  const isEn = lang !== 'vi';
  const manifest = {
    manifest_version: 3,
    name: "Verity - Web Safety, Transparency & Legality Scanner",
    version: "1.0.0",
    description: isEn 
      ? "Right-click any link or website to verify safety, transparency, and legality with Verity."
      : "Nhấp chuột phải vào bất kỳ liên kết hoặc trang web nào để kiểm tra độ an toàn, minh bạch và hợp pháp bằng Verity.",
    permissions: ["contextMenus", "activeTab", "storage"],
    host_permissions: ["<all_urls>"],
    background: {
      service_worker: "background.js",
    },
    action: {
      default_popup: "popup.html",
      default_title: "Verity Scanner",
    },
    icons: {
      "48": "icon48.png",
      "128": "icon128.png",
    },
  };

  const backgroundJs = `// Verity Chrome Extension Background Service Worker
const PLATFORM_URL = "${platformBaseUrl}";

chrome.runtime.onInstalled.addListener(() => {
  // Context menus on right-click
  chrome.contextMenus.create({
    id: "verity-scan-link",
    title: isEn ? "🛡️ Scan Link with Verity" : "🛡️ Quét liên kết với Verity",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "verity-scan-page",
    title: isEn ? "🔍 Scan Current Page with Verity" : "🔍 Quét trang web hiện tại với Verity",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "verity-scan-selection",
    title: isEn ? "⚖️ Audit Text / Terms with Verity" : "⚖️ Thẩm định văn bản/điều khoản với Verity",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = "";
  let targetType = "url";
  let targetValue = "";

  if (info.menuItemId === "verity-scan-link" && info.linkUrl) {
    targetType = "url";
    targetValue = info.linkUrl;
    targetUrl = \`\${PLATFORM_URL}/?targetType=url&targetValue=\${encodeURIComponent(info.linkUrl)}&autoScan=true\`;
  } else if (info.menuItemId === "verity-scan-page" && info.pageUrl) {
    targetType = "url";
    targetValue = info.pageUrl;
    targetUrl = \`\${PLATFORM_URL}/?targetType=url&targetValue=\${encodeURIComponent(info.pageUrl)}&autoScan=true\`;
  } else if (info.menuItemId === "verity-scan-selection" && info.selectionText) {
    targetType = "text";
    targetValue = info.selectionText;
    targetUrl = \`\${PLATFORM_URL}/?targetType=text&targetValue=\${encodeURIComponent(info.selectionText)}&autoScan=true\`;
  }

  if (targetUrl) {
    // Mở trang kết quả trên Nền tảng Verity
    chrome.tabs.create({ url: targetUrl });
  }
});
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Verity Scanner</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">
        <span class="icon">🛡️</span>
        <div>
          <h3>Verity</h3>
          <p class="subtitle">Explainable Trust Engine</p>
        </div>
      </div>
      <span class="version">v1.0</span>
    </div>

    <div class="url-box">
      <label>Trang web / Tên miền hiện tại:</label>
      <div id="current-url" class="url-text">Đang nhận diện URL...</div>
    </div>

    <button id="scan-btn" class="btn primary">
      ⚡ Quét nhanh An toàn & Pháp lý (Verity)
    </button>

    <div id="loading" class="loading hidden">
      <div class="spinner"></div>
      <p>Verity đang thẩm định An toàn, Minh bạch & Pháp lý...</p>
    </div>

    <div id="result" class="result hidden">
      <div class="score-row">
        <div class="score-circle" id="score-badge">--</div>
        <div>
          <h4 id="status-title">Kết quả đánh giá</h4>
          <p id="score-summary" class="summary-text"></p>
        </div>
      </div>

      <div class="sub-scores">
        <div class="meter">
          <span>An toàn:</span>
          <strong id="safety-score">--%</strong>
        </div>
        <div class="meter">
          <span>Minh bạch:</span>
          <strong id="transparency-score">--%</strong>
        </div>
        <div class="meter">
          <span>Pháp lý:</span>
          <strong id="legality-score">--%</strong>
        </div>
      </div>

      <a id="deep-dive-btn" href="#" target="_blank" class="btn secondary">
        📊 Xem Báo cáo chuyên sâu trên Verity
      </a>
    </div>

    <div class="footer">
      <small>Mẹo: Nhấp chuột phải vào bất kỳ link nào trên web để quét tức thì.</small>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
`;

  const popupCss = `body {
  margin: 0;
  padding: 0;
  width: 360px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
}
.card {
  padding: 16px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #38bdf8;
}
.brand .subtitle {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}
.version {
  font-size: 10px;
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  color: #64748b;
}
.url-box {
  background: #1e293b;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.url-box label {
  font-size: 11px;
  color: #94a3b8;
  display: block;
  margin-bottom: 4px;
}
.url-text {
  font-size: 12px;
  word-break: break-all;
  font-family: monospace;
  color: #e2e8f0;
}
.btn {
  display: block;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  box-sizing: border-box;
}
.btn.primary {
  background: #2563eb;
  color: white;
}
.btn.primary:hover {
  background: #1d4ed8;
}
.btn.secondary {
  background: #334155;
  color: #f1f5f9;
  margin-top: 10px;
}
.btn.secondary:hover {
  background: #475569;
}
.loading {
  text-align: center;
  padding: 16px 0;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #334155;
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 8px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.result {
  background: #1e293b;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.score-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: white;
  background: #64748b;
}
.score-circle.safe { background: #16a34a; }
.score-circle.caution { background: #ca8a04; }
.score-circle.danger { background: #dc2626; }
.summary-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: #cbd5e1;
}
.sub-scores {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  font-size: 11px;
  background: #0f172a;
  padding: 8px;
  border-radius: 6px;
}
.sub-scores .meter {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.footer {
  margin-top: 12px;
  text-align: center;
  color: #64748b;
}
.hidden { display: none !important; }
`;

  const popupJs = `const PLATFORM_URL = "${platformBaseUrl}";
let activeUrl = "";

document.addEventListener("DOMContentLoaded", async () => {
  const urlEl = document.getElementById("current-url");
  const scanBtn = document.getElementById("scan-btn");
  const loadingEl = document.getElementById("loading");
  const resultEl = document.getElementById("result");
  const deepDiveBtn = document.getElementById("deep-dive-btn");

  // Lấy URL hiện tại từ Chrome active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      activeUrl = tabs[0].url;
      urlEl.textContent = activeUrl;
    } else {
      urlEl.textContent = "Không tìm thấy URL hợp lệ";
      scanBtn.disabled = true;
    }
  });

  scanBtn.addEventListener("click", async () => {
    if (!activeUrl) return;

    scanBtn.classList.add("hidden");
    loadingEl.classList.remove("hidden");
    resultEl.classList.add("hidden");

    try {
      const response = await fetch(\`\${PLATFORM_URL}/api/scan\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "url",
          targetValue: activeUrl,
          persona: "consumer"
        })
      });

      const data = await response.json();
      loadingEl.classList.add("hidden");
      resultEl.classList.remove("hidden");

      const badge = document.getElementById("score-badge");
      badge.textContent = data.trustScore;
      badge.className = "score-circle " + data.status;

      document.getElementById("status-title").textContent =
        data.status === "safe" ? "Độ tin cậy Cao (An toàn)" :
        data.status === "caution" ? "Cần Thận trọng" : "Cảnh báo Rủi ro Cao!";

      document.getElementById("score-summary").textContent = data.summary;
      document.getElementById("safety-score").textContent = data.safetyScore + "%";
      document.getElementById("transparency-score").textContent = data.transparencyScore + "%";
      document.getElementById("legality-score").textContent = data.legalityScore + "%";

      deepDiveBtn.href = \`\${PLATFORM_URL}/?targetType=url&targetValue=\${encodeURIComponent(activeUrl)}&autoScan=true\`;
    } catch (err) {
      loadingEl.classList.add("hidden");
      scanBtn.classList.remove("hidden");
      alert("Không thể kết nối đến máy chủ Verity. Vui lòng thử lại!");
    }
  });
});
`;

  const readmeMd = `# Hướng dẫn cài đặt Verity Chrome Extension (Manifest V3)

1. Giải nén thư mục này vào máy tính của bạn (ví dụ: \`verity-chrome-extension\`).
2. Mở trình duyệt Google Chrome hoặc Microsoft Edge / Brave.
3. Truy cập địa chỉ: \`chrome://extensions/\`
4. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
5. Nhấp vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
6. Chọn thư mục đã giải nén ở Bước 1.
7. Xong! Biểu tượng khiên bảo mật Verity sẽ xuất hiện trên thanh công cụ.
8. Bạn có thể nhấp chuột phải vào bất kỳ liên kết hoặc trang web nào để chọn:
   - **Quét liên kết với Verity**
   - **Quét trang web hiện tại với Verity**
   - **Thẩm định văn bản/điều khoản với Verity**
`;

  return {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'background.js': backgroundJs,
    'popup.html': popupHtml,
    'popup.css': popupCss,
    'popup.js': popupJs,
    'README.md': readmeMd,
  };
}

export function getFirefoxExtensionFiles(platformBaseUrl: string, lang = 'vi') {
  const isEn = lang !== 'vi';
  const chromeFiles = getChromeExtensionFiles(platformBaseUrl, lang);

  const firefoxManifest = {
    manifest_version: 2,
    name: "Verity - Web Safety & Legality Scanner (Firefox Add-on)",
    version: "1.0.0",
    description: isEn
      ? "Right-click any link or website to verify safety, transparency, and legality with Verity."
      : "Nhấp chuột phải vào bất kỳ liên kết hoặc trang web nào để kiểm tra độ an toàn, minh bạch và hợp pháp bằng Verity.",
    permissions: ["contextMenus", "activeTab", "storage", "<all_urls>"],
    background: {
      scripts: ["background.js"],
    },
    browser_action: {
      default_popup: "popup.html",
      default_title: "Verity Scanner",
    },
    browser_specific_settings: {
      gecko: {
        id: "verity-scanner@aistudio.build",
        strict_min_version: "109.0",
      },
    },
  };

  const firefoxReadme = isEn ? `# Verity Firefox Add-on Installation Guide

1. Extract this zip archive on your computer.
2. Open Mozilla Firefox browser.
3. Navigate to: \`about:debugging#/runtime/this-firefox\`
4. Click **Load Temporary Add-on...**.
5. Select the \`manifest.json\` file in the extracted folder.
6. Done! The Verity security shield will appear on your toolbar.
7. Right-click any link or web page to audit safety and legal transparency in real time!
` : `# Hướng dẫn cài đặt Verity Firefox Add-on

1. Giải nén thư mục này vào máy tính của bạn.
2. Mở trình duyệt Mozilla Firefox.
3. Nhập vào thanh địa chỉ: \`about:debugging#/runtime/this-firefox\`
4. Nhấp vào nút **Tải phần bổ trợ tạm thời... (Load Temporary Add-on...)**.
5. Chọn tệp \`manifest.json\` trong thư mục vừa giải nén.
6. Xong! Tiện ích mở rộng Verity đã được kích hoạt trên Firefox.
7. Bạn có thể nhấp chuột phải vào bất kỳ trang web hoặc liên kết nào để kiểm tra an toàn và tính pháp lý tức thì!
`;

  return {
    ...chromeFiles,
    'manifest.json': JSON.stringify(firefoxManifest, null, 2),
    'README.md': firefoxReadme,
  };
}

export async function downloadExtensionZip(browser: 'chrome' | 'firefox', platformUrl: string, lang = 'vi') {
  const zip = new JSZip();
  const files = browser === 'chrome' ? getChromeExtensionFiles(platformUrl, lang) : getFirefoxExtensionFiles(platformUrl, lang);

  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `verity-${browser}-extension.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
