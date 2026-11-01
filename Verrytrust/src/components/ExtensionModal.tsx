import React, { useState } from 'react';
import { 
  Chrome, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  X, 
  Code, 
  Play, 
  Globe, 
  Layers
} from 'lucide-react';
import { 
  downloadExtensionZip, 
  getChromeExtensionFiles, 
  getFirefoxExtensionFiles 
} from '../utils/extensionGenerator';
import { useLanguage } from '../context/LanguageContext';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerScanFromExtension: (url: string) => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  isOpen,
  onClose,
  onTriggerScanFromExtension,
}) => {
  const { currentLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'download' | 'simulator' | 'code'>('download');
  const [selectedBrowser, setSelectedBrowser] = useState<'chrome' | 'firefox'>('chrome');
  const [activeCodeFile, setActiveCodeFile] = useState<string>('manifest.json');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Simulator states
  const [simContextPos, setSimContextPos] = useState<{ x: number; y: number } | null>(null);
  const [simSelectedTarget, setSimSelectedTarget] = useState<{ type: 'link' | 'page'; value: string } | null>(null);
  const [simPopupResult, setSimPopupResult] = useState<any | null>(null);
  const [simIsScanning, setSimIsScanning] = useState(false);

  if (!isOpen) return null;

  const currentPlatformUrl = typeof window !== 'undefined' ? window.location.origin : 'https://verity.trust';
  const extensionFiles = selectedBrowser === 'chrome' 
    ? getChromeExtensionFiles(currentPlatformUrl, currentLanguage.code) 
    : getFirefoxExtensionFiles(currentPlatformUrl, currentLanguage.code);

  const handleDownload = async (browser: 'chrome' | 'firefox') => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip(browser, currentPlatformUrl, currentLanguage.code);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCode = () => {
    const code = (extensionFiles as any)[activeCodeFile] || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock links in simulator
  const mockTargets = [
    { name: t('mockBankPhishing', 'Đường dẫn Ngân hàng giả mạo (Phishing)'), url: 'https://vietcombank-otp-xac-thuc-khan-cap.top/login', risk: 'high' },
    { name: t('mockShopScam', 'Cửa hàng giả mạo thương mại điện tử'), url: 'https://shopee-giam-gia-soc-99k.vip/san-pham', risk: 'high' },
    { name: t('mockLegitFpt', 'Trang thông tin doanh nghiệp hợp pháp'), url: 'https://fpt.com/vi/ve-fpt/chinh-sach-bao-ve-du-lieu-ca-nhan', risk: 'low' },
  ];

  const handleRightClickMock = (e: React.MouseEvent, type: 'link' | 'page', value: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setSimContextPos({ x: e.clientX - rect.left + 10, y: e.clientY - rect.top + 10 });
    setSimSelectedTarget({ type, value });
  };

  const handleExecuteSimScan = async (action: 'in-popup' | 'in-app') => {
    if (!simSelectedTarget) return;
    setSimContextPos(null);

    if (action === 'in-app') {
      onTriggerScanFromExtension(simSelectedTarget.value);
      onClose();
      return;
    }

    // In-popup preview simulator
    setSimIsScanning(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'url',
          targetValue: simSelectedTarget.value,
          persona: 'consumer',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimPopupResult({ ...data, url: simSelectedTarget.value });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Chrome className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {t('extTitle', 'Tiện ích Trình duyệt Verity (Browser Extension)')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                  Manifest V3
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('extSubtitle', 'Bảo vệ thời gian thực trên mọi trình duyệt với công nghệ xác thực tức thì')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('download')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'download'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            {t('extStep1Title', 'Tải về & Cài đặt')}
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4" />
            {t('extSimTitle', 'Mô phỏng Trực quan Tiện ích Trình duyệt')}
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'code'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            {t('tabCode', 'Mã nguồn Extension')}
          </button>
        </div>

        {/* Tab 1: Download & Install Instructions */}
        {activeTab === 'download' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chrome Card */}
              <div className="p-5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:border-blue-500/50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 text-blue-400">
                      <Chrome className="w-6 h-6" />
                      <h4 className="font-semibold text-white">Google Chrome / Edge / Brave</h4>
                    </div>
                    <span className="text-xs bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded">Manifest V3</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {t('extSubtitle', 'Hỗ trợ Chrome, Brave, MS Edge, Opera. Tự động thêm mục quét vào menu chuột phải.')}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('chrome')}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? '...' : t('extDownloadChrome', 'Tải mã nguồn Chrome / Brave / Edge')}
                </button>
              </div>

              {/* Firefox Card */}
              <div className="p-5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:border-amber-500/50 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 text-amber-400">
                      <Globe className="w-6 h-6" />
                      <h4 className="font-semibold text-white">Mozilla Firefox</h4>
                    </div>
                    <span className="text-xs bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded">Gecko Add-on</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {t('extSubtitle', 'Tương thích hoàn hảo với Mozilla Firefox. Quét an toàn và bảo mật danh tính.')}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('firefox')}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? '...' : t('extDownloadFirefox', 'Tải mã nguồn Firefox')}
                </button>
              </div>
            </div>

            {/* Step by Step Install Guide */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                {t('processTitle', 'Hướng dẫn cài đặt nhanh')}:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                <div className="space-y-2 border-l-2 border-blue-500/50 pl-3">
                  <div className="font-semibold text-blue-400">{t('extStep1Title', 'Dành cho Google Chrome & Edge')}:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>{t('extStep1Desc', 'Nhấp nút tải xuống để nhận gói mở rộng định dạng chuẩn Manifest V3.')}</li>
                    <li>{t('extStep2Desc', 'Truy cập chrome://extensions và bật "Chế độ dành cho nhà phát triển".')}</li>
                    <li>{t('extStep3Desc', 'Nhấp "Tải tiện ích đã giải nén" và chọn thư mục vừa giải nén.')}</li>
                  </ol>
                </div>
                <div className="space-y-2 border-l-2 border-amber-500/50 pl-3">
                  <div className="font-semibold text-amber-400">{t('extDownloadFirefox', 'Dành cho Mozilla Firefox')}:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>{t('extFirefoxStep1', 'Giải nén file ZIP vừa tải về.')}</li>
                    <li>{t('extFirefoxStep2', 'Mở Firefox và vào địa chỉ:')} <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">about:debugging#/runtime/this-firefox</code></li>
                    <li>{t('extFirefoxStep3', 'Nhấn "Tải phần bổ trợ tạm thời" và chọn file manifest.json.')}</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Simulator */}
        {activeTab === 'simulator' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>{t('extSimTitle', 'Mô phỏng')}:</strong> {t('extSimSubtitle', 'Thử nghiệm trải nghiệm người dùng thực tế với menu chuột phải và huy hiệu an toàn:')}
              </span>
            </div>

            {/* Mock Web Browser Viewport */}
            <div 
              className="relative bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-inner min-h-[360px] p-5 select-none"
              onClick={() => setSimContextPos(null)}
              onContextMenu={(e) => handleRightClickMock(e, 'page', 'https://example-current-page.com/terms')}
            >
              {/* Browser Bar */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 text-xs text-slate-400">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1 font-mono text-slate-300 flex items-center justify-between">
                  <span>https://demo-web-page.com/terms-and-service</span>
                  <span className="text-slate-500 text-[10px]">🔒 SSL TLS 1.3</span>
                </div>
              </div>

              {/* Web Content */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">
                  {t('presetsTitle', 'Các liên kết mẫu để thử nghiệm tính năng chuột phải của Extension:')}
                </h4>
                <div className="space-y-3">
                  {mockTargets.map((item, idx) => (
                    <div 
                      key={idx}
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        handleRightClickMock(e, 'link', item.url);
                      }}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-xs text-slate-200">{item.name}</div>
                        <div className="text-[11px] font-mono text-blue-400 underline">{item.url}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        item.risk === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {item.risk === 'high' ? t('statusDanger', 'Nguy hiểm') : t('statusSafe', 'An toàn')}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 italic mt-3">
                  * {t('extSimRightClick', 'Nhấp chuột phải vào bất kỳ liên kết nào ở trên để quét.')}
                </p>
              </div>

              {/* Simulated Right-Click Context Menu */}
              {simContextPos && simSelectedTarget && (
                <div 
                  style={{ top: `${simContextPos.y}px`, left: `${simContextPos.x}px` }}
                  className="absolute z-20 w-64 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md py-1 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800 font-semibold">
                    Verity Context Menu
                  </div>
                  <button 
                    onClick={() => handleExecuteSimScan('in-popup')}
                    className="w-full text-left px-3 py-2 hover:bg-blue-600/30 hover:text-blue-300 flex items-center gap-2 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>{t('extSimRunScan', 'Xem điểm tin cậy trong Popup')}</span>
                  </button>
                  <button 
                    onClick={() => handleExecuteSimScan('in-app')}
                    className="w-full text-left px-3 py-2 hover:bg-blue-600/30 hover:text-blue-300 flex items-center gap-2 transition cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>{t('introBtnMain', 'Mở Báo cáo đầy đủ trên Verity')}</span>
                  </button>
                </div>
              )}

              {/* Simulated Extension Popup Result Drawer */}
              {simIsScanning && (
                <div className="absolute top-4 right-4 z-30 w-72 bg-slate-900 border border-blue-500/40 rounded-xl p-4 shadow-2xl text-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-slate-300 font-medium">{t('btnScanning', 'Đang thẩm định bảo mật...')}</p>
                </div>
              )}

              {simPopupResult && !simIsScanning && (
                <div className="absolute top-4 right-4 z-30 w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                      Verity Extension Preview
                    </div>
                    <button 
                      onClick={() => setSimPopupResult(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0 ${
                      simPopupResult.trustScore >= 80 ? 'bg-emerald-600' :
                      simPopupResult.trustScore >= 50 ? 'bg-amber-600' : 'bg-red-600'
                    }`}>
                      {simPopupResult.trustScore}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {simPopupResult.status === 'safe' ? t('statusSafe', 'An toàn') :
                         simPopupResult.status === 'caution' ? t('statusCaution', 'Cần Thận trọng') : t('statusDanger', 'Nguy hiểm')}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {simPopupResult.summary}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      onTriggerScanFromExtension(simPopupResult.url);
                      onClose();
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {t('histViewAgain', 'Xem Báo cáo Đầy đủ')}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Code Viewer */}
        {activeTab === 'code' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Object.keys(extensionFiles).map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setActiveCodeFile(filename)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      activeCodeFile === filename
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filename}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('copied', 'Đã sao chép') : t('copySummary', 'Sao chép')}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[340px]">
              {(extensionFiles as any)[activeCodeFile] || '// Empty'}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>{t('footerZeroTrust', 'Kiến trúc Zero-Trust & Thẩm định Minh bạch')}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition cursor-pointer"
          >
            {t('btnCancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
};
