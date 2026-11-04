import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  FileText, 
  Code2, 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Sparkles, 
  Lock, 
  Share2, 
  Check, 
  AlertCircle,
  FileCode,
  Zap,
  UserCheck,
  Briefcase,
  Scale,
  Radio,
  Activity,
  Compass
} from 'lucide-react';
import { TargetType, Persona, Organization } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ScannerInputProps {
  onScan: (params: {
    targetType: TargetType;
    targetValue: string;
    targetTitle?: string;
    fileData?: string;
    mimeType?: string;
    isOrgShared: boolean;
    isSensitive: boolean;
    engineMode: 'simplified' | 'deep';
  }) => void;
  isLoading: boolean;
  currentPersona: Persona;
  onChangePersona?: (persona: Persona) => void;
  currentOrg: Organization | null;
}

export const ScannerInput: React.FC<ScannerInputProps> = ({
  onScan,
  isLoading,
  currentPersona,
  onChangePersona,
  currentOrg,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TargetType>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Org sharing settings
  const [isOrgShared, setIsOrgShared] = useState(true);
  const [isSensitive, setIsSensitive] = useState(false);
  const [engineMode] = useState<'deep'>('deep');

  // Preset Samples
  const presets = [
    {
      label: t('presetPhishingLabel', 'Ngân hàng giả mạo (Phishing)'),
      type: 'url' as TargetType,
      value: 'https://vietcombank-xac-thuc-otp-khan-cap.top/login-secure',
      title: t('presetPhishingTitle', 'Trang web mạo danh Ngân hàng Vietcombank'),
      desc: t('presetPhishingDesc', 'Giả mạo giao diện ngân hàng để chiếm đoạt tài khoản')
    },
    {
      label: t('presetEcommerceLabel', 'Cửa hàng Online lừa đảo'),
      type: 'url' as TargetType,
      value: 'https://shopee-sale-dong-gia-10k.shop-khuyen-mai-vip.xyz/flash-sale',
      title: t('presetEcommerceTitle', 'Web thương mại điện tử mạo danh Shopee'),
      desc: t('presetEcommerceDesc', 'Chiêu trò giảm giá 90% để thu thập thông tin thẻ')
    },
    {
      label: t('presetToSLabel', 'Điều khoản Dịch vụ ToS bất lợi'),
      type: 'document' as TargetType,
      value: `ĐIỀU KHOẢN DỊCH VỤ VÀ CHÍNH SÁCH BẢO MẬT (TRÍCH ĐOẠN ĐÁNG NGỜ):
1. Thu thập dữ liệu: Bằng cách sử dụng ứng dụng, người dùng đồng ý vô điều kiện cho phép chúng tôi truy cập danh bạ, vị trí GPS liên tục, micro và camera ngay cả khi ứng dụng đang đóng.
2. Chuyển giao dữ liệu bên thứ 3: Chúng tôi có quyền bán, thương mại hóa và chuyển nhượng toàn bộ dữ liệu cá nhân của bạn cho bất kỳ đối tác quảng cáo nào mà không cần thông báo trước.
3. Miễn trừ trách nhiệm tuyệt đối: Chúng tôi hoàn toàn không chịu trách nhiệm đối với bất kỳ thiệt hại tài chính, lộ lọt dữ liệu hoặc sự cố mạng nào xảy ra với người dùng.
4. Trọng tài bắt buộc: Người dùng từ bỏ quyền khiếu nại tập thể và quyền đưa tranh chấp ra Tòa án nhân dân có thẩm quyền theo pháp luật Việt Nam.`,
      title: t('presetToSTitle', 'Điều khoản ToS phần mềm tiện ích di động'),
      desc: t('presetToSDesc', 'Hợp đồng điện tử vi phạm Nghị định 13 & quyền riêng tư')
    },
    {
      label: t('presetMisinfoLabel', 'Tin tức giả mạo / Thiên kiến (Deepfake claim)'),
      type: 'text' as TargetType,
      value: `CẢNH BÁO KHẨN CẤP: Bộ Y tế vừa ban hành chỉ thị bắt buộc toàn bộ công dân cài đặt ứng dụng theo dõi sinh trắc học mới trong 24 giờ tới, nếu không sẽ bị khóa toàn bộ tài khoản ngân hàng và căn cước công dân. Hãy chia sẻ gấp cho bạn bè người thân trước khi bị chặn!`,
      title: t('presetMisinfoTitle', 'Tin tức giả mạo trên mạng xã hội'),
      desc: t('presetMisinfoDesc', 'Phát tán thông tin bịa đặt gây hoang mang dư luận')
    },
    {
      label: t('presetSafeLabel', 'Doanh nghiệp Hợp chuẩn (Mẫu chuẩn mực)'),
      type: 'url' as TargetType,
      value: 'https://fpt.com/vi/ve-fpt/chinh-sach-bao-ve-du-lieu-ca-nhan',
      title: t('presetSafeTitle', 'Chính sách bảo vệ dữ liệu Tập đoàn FPT'),
      desc: t('presetSafeDesc', 'Tuân thủ đầy đủ Nghị định 13 và tiêu chuẩn ISO 27001')
    }
  ];

  const [isArrivalHighlighted, setIsArrivalHighlighted] = useState(false);
  const [scanPhaseIndex, setScanPhaseIndex] = useState(0);

  const scanPhases = [
    t('phase1', 'Đang kiểm tra Handshake DNS & Chứng thư SSL TLS 1.3...'),
    t('phase2', 'Đang rà soát NLP Điều khoản ToS & Trích xuất Dấu hiệu Rủi ro...'),
    t('phase3', 'Đang đối chiếu Cơ sở dữ liệu An toàn Mạng & Nghị định 13 / GDPR...'),
    t('phase4', 'Đang tính toán Ma trận Trọng số & Cấp Báo cáo Minh bạch...')
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setScanPhaseIndex(0);
      interval = setInterval(() => {
        setScanPhaseIndex((prev) => (prev + 1) % scanPhases.length);
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const smoothScrollToScanner = () => {
    setIsArrivalHighlighted(true);
    setTimeout(() => setIsArrivalHighlighted(false), 400);
    setTimeout(() => {
      const el = document.getElementById('url-scan-section');
      if (el) {
        const yOffset = -70;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 10);
  };

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setActiveTab(preset.type);
    if (preset.type === 'url') {
      setUrlInput(preset.value);
    } else if (preset.type === 'document' || preset.type === 'text') {
      setTextInput(preset.value);
      setFileTitle(preset.title);
    }
    smoothScrollToScanner();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileMime(file.type);
    setFileTitle(file.name);

    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Text / PDF / Docx
      reader.onload = () => {
        const text = reader.result as string;
        setTextInput(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    smoothScrollToScanner();

    if (activeTab === 'url') {
      if (!urlInput.trim()) return;
      let formattedUrl = urlInput.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      onScan({
        targetType: 'url',
        targetValue: formattedUrl,
        targetTitle: formattedUrl,
        isOrgShared,
        isSensitive,
        engineMode,
      });
    } else if (activeTab === 'document' || activeTab === 'text') {
      if (!textInput.trim()) return;
      onScan({
        targetType: activeTab,
        targetValue: textInput.trim(),
        targetTitle: fileTitle.trim() || (activeTab === 'document' 
          ? t('docTargetTitleDefault', 'Tài liệu Pháp lý & Điều khoản') 
          : t('textTargetTitleDefault', 'Đoạn văn bản thẩm định')),
        isOrgShared,
        isSensitive,
        engineMode,
      });
    } else if (activeTab === 'image') {
      if (!fileBase64) return;
      onScan({
        targetType: 'image',
        targetValue: fileTitle || t('evidenceImageTargetValue', 'Ảnh chụp màn hình / Bằng chứng số'),
        targetTitle: fileTitle || fileName || t('evidenceImageTargetTitle', 'Ảnh bằng chứng'),
        fileData: fileBase64,
        mimeType: fileMime || 'image/png',
        isOrgShared,
        isSensitive,
        engineMode,
      });
    }
  };

  return (
    <div id="url-scan-section" className="w-full space-y-6 scroll-mt-24">
      
      {/* Input Box Container with Laser Curtain & Cyber HUD */}
      <div className={`relative bg-slate-900/95 border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-500 cyber-grid ${
        isArrivalHighlighted 
          ? 'animate-target-arrival ring-4 ring-cyan-400/80 border-cyan-400' 
          : isLoading 
            ? 'border-cyan-500/80 ring-2 ring-cyan-500/40 animate-pulse-glow' 
            : 'border-slate-700/80 hover:border-slate-600'
      }`}>
        
        {/* Futuristic HUD Corner Reticles */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/70 rounded-tl pointer-events-none z-20" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/70 rounded-tr pointer-events-none z-20" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/70 rounded-bl pointer-events-none z-20" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/70 rounded-br pointer-events-none z-20" />

        {/* Cinematic Laser Scanning Curtain with trailing glow wash */}
        {isLoading && (
          <div className="absolute inset-x-0 pointer-events-none z-30 animate-laser-curtain">
            {/* Core laser line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_#22d3ee,0_0_40px_#06b6d4]" />
            {/* Volumetric trailing wash */}
            <div className="h-20 bg-gradient-to-b from-cyan-400/20 via-blue-500/10 to-transparent blur-[1px]" />
          </div>
        )}

        {/* Cinematic Live Scanning HUD Header */}
        {isLoading && (
          <div className="bg-gradient-to-r from-slate-950 via-cyan-950/80 to-slate-950 border-b border-cyan-500/40 p-4 space-y-3 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-300">
              <div className="flex items-center gap-3">
                {/* Rotating radar / compass */}
                <div className="relative w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-cyan-950/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <div className="absolute inset-0 rounded-full border-t border-cyan-300 animate-radar-spin" />
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>{t('hudLiveVerity', 'Đang thẩm định trực tiếp với Verity')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-[10px] text-cyan-300 font-mono tracking-wider">
                      LIVE HUD
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/80 font-mono transition-all duration-300">
                    {scanPhases[scanPhaseIndex]}
                  </p>
                </div>
              </div>

              {/* Live Waveform frequency visualizer */}
              <div className="flex items-end gap-1 h-6 px-3 py-1 bg-slate-900/90 border border-cyan-500/30 rounded-lg shadow-sm">
                <span className="text-[10px] text-cyan-400/80 font-mono mr-1.5 uppercase font-semibold">Telemetry</span>
                <span className="w-1 bg-cyan-400 rounded-full animate-wave-1" />
                <span className="w-1 bg-cyan-300 rounded-full animate-wave-2" />
                <span className="w-1 bg-blue-400 rounded-full animate-wave-3" />
                <span className="w-1 bg-cyan-400 rounded-full animate-wave-4" />
                <span className="w-1 bg-indigo-400 rounded-full animate-wave-5" />
              </div>
            </div>

            {/* Holographic Shimmer Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden p-[1px]">
              <div className="h-full rounded-full animate-shimmer" />
            </div>

            {/* 4 Multi-step verification nodes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{t('stepDnsSsl', '1. DNS & SSL Khớp')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>{t('stepTosFlags', '2. Rà soát ToS & Cờ đỏ')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>{t('stepDecree13', '3. Nghị định 13')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>{t('stepScoreReady', '4. Điểm số Minh bạch')}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Perspective & In-Depth Reasoning Component (No Specific Section Heading) */}
        {onChangePersona && (
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <span>{t('perspectiveLabel', 'Góc nhìn xác nhận tính minh bạch:')}</span>
              </span>
              
              {/* In-depth reasoning component preserved without a standalone section heading */}
              <div
                title={t('engineDeepDesc', 'Phân tích đa chiều ngữ cảnh và pháp chế chuyên sâu qua mạng nơ-ron học máy.')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[11px] font-medium select-none shadow-sm shadow-purple-500/5"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>{t('engineDeep', 'Mô hình Suy luận Chuyên sâu')}</span>
              </div>
            </div>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => onChangePersona('consumer')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  currentPersona === 'consumer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('personaConsumer', 'Cá nhân')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangePersona('business')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  currentPersona === 'business'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{t('personaBusiness', 'Doanh nghiệp (SME)')}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangePersona('legal')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  currentPersona === 'legal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('personaLegal', 'Pháp chế')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeTab === 'url'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            {t('tabUrl', 'URL Trang Web')}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeTab === 'document'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t('tabDoc', 'Văn bản / ToS')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCode className="w-4 h-4" />
            {t('tabCode', 'Mã nguồn Hợp đồng')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeTab === 'image'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            {t('tabImage', 'Hình ảnh / Bằng chứng')}
          </button>
        </div>

        {/* Tab Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* URL / Domain Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>{t('urlInputLabel', 'Nhập tên miền (Domain) hoặc URL trang web bất kỳ:')}</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {t('urlInputBadge', 'Công khai • Mọi người đều có thể tra cứu')}
                  </span>
                </label>
                <span className="text-[11px] text-slate-500 font-normal">{t('urlInputHint', 'Hỗ trợ .vn, .com, .net, sub-domain...')}</span>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={t('urlInputPlaceholder', 'Ví dụ: shopee.vn, vietcombank.com.vn, google.com hoặc https://...')}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
                />
                <Globe className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>

              {/* Quick Popular Domain Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500">{t('quickDomainLabel', 'Tra cứu nhanh tên miền:')}</span>
                {[
                  'shopee.vn',
                  'vietcombank.com.vn',
                  'chinhphu.vn',
                  'zalo.me',
                  'fpt.com',
                  'vnexpress.net',
                  'tiktok.com',
                ].map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setUrlInput(domain)}
                    className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[10px] transition hover:text-white border border-slate-700/60"
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document / ToS / Contract Input */}
          {activeTab === 'document' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('pasteTosLabel', 'Dán nội dung Điều khoản dịch vụ (ToS), Chính sách quyền riêng tư hoặc tải tệp:')}
                </label>
                <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('uploadFileBtn', 'Tải tệp (.txt, .md, .pdf)')}</span>
                  <input type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {fileName && (
                <div className="text-xs bg-slate-950 p-2 rounded-lg text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  {t('fileUploadedPrefix', 'Đã tải tệp:')} <span className="font-semibold text-white">{fileName}</span>
                </div>
              )}

              <input
                type="text"
                placeholder={t('docTitlePlaceholder', 'Tiêu đề tài liệu (ví dụ: ToS Ứng dụng Quản lý Tài chính)')}
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />

              <textarea
                rows={5}
                required
                placeholder={t('docPlaceholder', 'Dán toàn bộ hoặc các điều khoản đáng ngờ vào đây để kiểm tra dấu hiệu rủi ro (red flags), điều khoản miễn trách và chỉ số tuân thủ GDPR/Nghị định 13...')}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed font-mono"
              />
            </div>
          )}

          {/* Text / News / Code Snippet Input */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">
                {t('tabCode', 'Nhập đoạn tin tức, bài viết mạng xã hội hoặc đoạn mã nguồn cần xác minh')}:
              </label>
              <textarea
                rows={5}
                required
                placeholder={t('codePlaceholder', 'Dán nội dung bài đăng, tin nhắn cảnh báo hoặc tin tức để phân tích độ tin cậy...')}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed"
              />
            </div>
          )}

          {/* Image Input (Deepfake / Screenshot) */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">
                {t('tabImage', 'Tải lên ảnh chụp màn hình gian hàng, biên lai giao dịch hoặc hình ảnh nghi vấn')}:
              </label>

              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition cursor-pointer relative bg-slate-950/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-2">
                  <ImageIcon className="w-8 h-8 text-blue-400 mx-auto" />
                  <div className="text-xs text-slate-300 font-medium">
                    {fileName ? `${t('fileSelectedPrefix', 'Đã chọn:')} ${fileName}` : t('dropzoneTitle', 'Kéo thả hoặc bấm để tải lên ảnh chụp trang web, hóa đơn hoặc bằng chứng')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('dropzoneSub', 'Hỗ trợ PNG, JPG, WEBP (tối đa 10MB)')}
                  </div>
                </div>
              </div>

              {fileBase64 && (
                <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-slate-700 mt-2">
                  <img src={fileBase64} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end text-xs">

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`ml-auto px-6 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2.5 cursor-pointer shadow-lg active:scale-95 ${
                isLoading
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-600/30 hover:shadow-cyan-500/30 hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="relative w-4 h-4">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 rounded-full border border-cyan-300 animate-ping opacity-40" />
                  </div>
                  <span className="font-mono">{t('btnScanning', 'Đang kiểm định bảo mật...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                  <span>{t('btnScan', 'Xác nhận Tính Minh bạch Ngay')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{t('presetsTitle', 'Thử nghiệm nhanh mẫu thực tế (Nhấn để trượt xuống & quét tức thì):')}</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">{t('presetSubtitle', 'Tự động đối chiếu quy chuẩn Việt Nam & Quốc tế')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-3.5 text-left rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/90 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200 space-y-1.5 group cursor-pointer active:scale-95"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 flex items-center justify-between transition-colors">
                <span className="line-clamp-1">{preset.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 font-mono uppercase transition-colors shrink-0 ml-1">
                  {preset.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 group-hover:text-slate-300 line-clamp-1 transition-colors">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
