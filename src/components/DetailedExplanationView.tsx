import React, { useState } from 'react';
import { 
  Cpu, 
  Scale, 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  Check, 
  Code2, 
  Lock, 
  Server,
  Chrome,
  Building2,
  History,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DetailedExplanationViewProps {
  onGoToMain: () => void;
  onOpenExtensionModal: () => void;
  onOpenOrgModal: () => void;
  onOpenHistory: () => void;
}

export const DetailedExplanationView: React.FC<DetailedExplanationViewProps> = ({
  onGoToMain,
  onOpenExtensionModal,
  onOpenOrgModal,
  onOpenHistory,
}) => {
  const { t } = useLanguage();
  const [activeCodeTab, setActiveCodeTab] = useState<'scoring' | 'extension' | 'rules' | 'api' | 'pipeline' | 'compliance'>('scoring');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    scoring: `// [Thuật toán Verity: Tính toán Điểm tin cậy & Trọng số suy luận]
function calculateVerityTrustScore(metrics: EvaluationMetrics): TrustReportVerdict {
  const { safetyScore, transparencyScore, legalityScore, criticalRedFlags } = metrics;
  
  // Trọng số cơ sở được công khai 100%
  const WEIGHT_SAFETY = 0.40;
  const WEIGHT_TRANSPARENCY = 0.30;
  const WEIGHT_LEGALITY = 0.30;
  
  let baseScore = (safetyScore * WEIGHT_SAFETY) + 
                  (transparencyScore * WEIGHT_TRANSPARENCY) + 
                  (legalityScore * WEIGHT_LEGALITY);

  // Cơ chế Khóa Vi phạm Nghiêm trọng (Penalty Gate):
  // Nếu phát hiện bẫy lừa đảo (phishing), đánh cắp OTP, hoặc mã độc ransomware:
  if (criticalRedFlags.includes('ACTIVE_PHISHING_CREDENTIAL_THEFT') || 
      criticalRedFlags.includes('MALWARE_SIGNATURE')) {
    baseScore = Math.min(baseScore, 20); // Khóa điểm ở mức Cảnh báo Nguy hiểm (Đỏ)
  }

  return {
    trustScore: Math.round(baseScore),
    status: baseScore >= 80 ? 'safe' : (baseScore >= 50 ? 'caution' : 'danger'),
    weights: { safety: WEIGHT_SAFETY, transparency: WEIGHT_TRANSPARENCY, legality: WEIGHT_LEGALITY }
  };
}`,

    extension: `// [Verity Browser Extension: background.js - W3C Manifest V3]
// Tôn trọng quyền riêng tư: 100% Không theo dõi hành vi, Không gửi cookie hoặc dữ liệu cá nhân
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verity-scan-link",
    title: "🛡️ Quét liên kết với Verity",
    contexts: ["link", "selection", "page"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || info.pageUrl;
  if (!targetUrl) return;

  // Mở tab phân tích minh bạch hoặc hiển thị Popup HUD
  chrome.tabs.create({
    url: \`https://verity.trust/scan?url=\${encodeURIComponent(targetUrl)}&autoScan=true\`
  });
});`,

    rules: `// [firestore.rules - Phân quyền RBAC & Bảo vệ Dữ liệu]
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chỉ người dùng trong cùng Tổ chức (Org) mới có quyền đọc báo cáo nhạy cảm
    match /scans/{scanId} {
      allow read: if resource.data.isSensitive == false || 
                     (request.auth != null && request.auth.uid == resource.data.userId);
      allow create: if request.auth != null;
    }
    
    // Nhật ký kiểm toán không thể bị xóa hoặc sửa (Immutable Append-only)
    match /auditLogs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false; 
    }
  }
}`,

    api: `// [Hợp đồng Giao diện Lập trình REST API: /api/scan]
POST /api/scan HTTP/1.1
Host: verity.trust
Content-Type: application/json

Request Payload:
{
  "targetType": "url" | "text" | "document" | "image",
  "targetValue": "https://example.com",
  "engineMode": "simplified" | "deep",
  "persona": "consumer" | "business" | "legal"
}

Response Contract (Explainable Schema & SLA Telemetry):
{
  "trustScore": 96,
  "status": "safe",
  "safetyScore": 98,
  "transparencyScore": 94,
  "legalityScore": 95,
  "engineMode": "simplified",
  "latencyMs": 184,
  "technicalMetrics": {
    "engine": "Simplified Ultra-Fast Model (<1.2s SLA)",
    "totalLatencyMs": 184,
    "slaMet": true,
    "slaTargetMs": 1200,
    "dnsLookupMs": 18,
    "tlsHandshakeMs": 82,
    "httpProbeMs": 104,
    "heuristicsMs": 4,
    "tlsVersion": "TLSv1.3",
    "hstsEnabled": true
  }
}`,

    pipeline: `// [HIGH-PERFORMANCE ULTRA-LOW-LATENCY VERIFICATION PIPELINE (< 1.2s SLA)]
// Production-grade async concurrent architecture in Rust / Systems Runtime
// Pillars: Decoupled I/O, Zero-Copy Buffers, Lock-Free LRU Cache (<2ms), SIMD Heuristics

use std::sync::Arc;
use tokio::time::{timeout, Duration, Instant};
use tokio::net::TcpStream;
use rustls::ClientConfig;
use ring::digest::{Context, SHA256};

pub struct VerificationSLAConfig {
    pub max_total_latency: Duration, // Strict 1,200ms Hard SLA
    pub dns_timeout: Duration,       // 250ms Circuit Breaker
    pub tls_timeout: Duration,       // 350ms Non-blocking Handshake
    pub http_timeout: Duration,      // 450ms Header & DOM Probe
}

impl Default for VerificationSLAConfig {
    fn default() -> Self {
        Self {
            max_total_latency: Duration::from_millis(1200),
            dns_timeout: Duration::from_millis(250),
            tls_timeout: Duration::from_millis(350),
            http_timeout: Duration::from_millis(450),
        }
    }
}

/// 1. Asynchronous Decoupled Concurrent Pipeline (< 1.2s SLA)
pub async fn verify_web_transparency_fast(
    target_url: &str,
    cache: &Arc<LockFreeLruCache>,
) -> Result<VerificationReport, SLAError> {
    let pipeline_start = Instant::now();
    let fingerprint = compute_sha256_fingerprint(target_url);

    // [Fast Path]: Lock-Free In-Memory Cache Fingerprint Hit (< 2ms)
    if let Some(mut cached_report) = cache.get(&fingerprint) {
        cached_report.latency_ms = pipeline_start.elapsed().as_millis() as u64;
        return Ok(cached_report);
    }

    let parsed_url = url::Url::parse(target_url)?;
    let host = parsed_url.host_str().ok_or(SLAError::InvalidHost)?;

    // [Concurrent Fan-Out]: Decouple I/O-bound Network Probes
    let dns_future = tokio::spawn(async move {
        timeout(Duration::from_millis(250), resolve_dns_fast(host)).await
    });

    let tls_future = tokio::spawn(async move {
        timeout(Duration::from_millis(350), probe_tls_socket(host)).await
    });

    let header_future = tokio::spawn(async move {
        timeout(Duration::from_millis(450), probe_http_headers(target_url)).await
    });

    // Await all concurrent tasks with hard timeout circuit-breaker
    let (dns_res, tls_res, header_res) = tokio::join!(dns_future, tls_future, header_future);

    // 2. CPU-Bound Heuristics: Zero-Copy Parsing & SIMD Pattern Evaluation (< 5ms)
    let heuristics = evaluate_heuristics_simd(target_url, &tls_res, &header_res);

    let total_latency = pipeline_start.elapsed();
    assert!(total_latency < Duration::from_millis(1200), "Strict Sub-1.2s SLA violated!");

    let report = compile_xai_report(heuristics, total_latency);
    cache.insert(fingerprint, report.clone());
    Ok(report)
}`,

    compliance: `// [Verity: Tuân thủ Pháp luật An ninh mạng Việt Nam, EU, Hoa Kỳ & Tường lửa]
// 1. Pháp luật Việt Nam:
// - Luật An ninh mạng số 24/2018/QH14 (Điều 8, Điều 18)
// - Bộ luật Hình sự (Điều 321: Đánh bạc; Điều 322: Tổ chức đánh bạc)
// - Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)
// -> Quy trình quét thụ động (Passive Probing): 100% không quét cổng xâm nhập, 
//    không tấn công DoS, không trích xuất dữ liệu riêng tư.
// -> Phát hiện cờ bạc/cá cược lậu (như m88.com, w88.com, kubet):
//    Khóa điểm nguy hiểm (Điểm Pháp lý: 0, Trust Score: 12), đánh dấu vi phạm hình sự.

// 2. Tường lửa Web (WAF) & Tường lửa An ninh mạng Quốc gia:
// - Tường lửa WAF (Cloudflare/AWS Shield): Cơ chế bảo vệ hạ tầng hợp pháp theo NIS2 & NIST.
// - Tường lửa Quốc gia (NCSC/Bộ TTTT & Cục A05 Bộ Công an): Buộc các ISP (VNPT, Viettel, FPT)
//   chặn kết nối đối với các tên miền cờ bạc lậu và lừa đảo xuyên biên giới.

// 3. Công nhận Tên miền của Chính phủ (National Government Recognition):
// - Cổng thông tin Cơ quan Nhà nước: Xác nhận bởi VNNIC (.gov.vn / .chinhphu.vn)
// - Doanh nghiệp hợp pháp: Xác nhận pháp nhân đăng ký và mã số thuế.
// - Tên miền bất hợp pháp: Không được Nhà nước công nhận, nằm trong danh sách đen quốc gia.`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-8 lg:space-y-10 animate-page-enter py-2">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold backdrop-blur-md">
          <Code2 className="w-3.5 h-3.5" />
          <span>{t('expHeaderTitle', 'Giải thích Chi tiết & Nguyên lý Vận hành')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-[1.25] font-display">
          {t('expHeaderTitle', 'Giải thích Chi tiết & Nguyên lý Vận hành')} <br className="hidden sm:inline" />
          <span className="animate-gradient-text bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
            {t('heroTitleHighlight', 'Chuẩn Mực với Verity')}
          </span>
        </h1>
        <p className="text-xs sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl mx-auto">
          {t('expHeaderSubtitle', 'Kiến trúc hệ thống, công thức toán học và chuỗi chứng thực minh bạch')}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onGoToMain}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition inline-flex items-center gap-2 cursor-pointer"
          >
            <span>{t('expBtnBack', 'Về Trang chính')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PILLAR 1 */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{t('pillar1Tag', 'Trụ cột 1')}</div>
            <h2 className="text-xl font-bold text-white">{t('pillar1Title', 'Thu thập Đa nguồn & Trích xuất Đặc trưng')}</h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {t('pillar1Desc', 'Tiếp nhận URL, mã nguồn, tài liệu pháp lý và phân tách thành các token ngữ nghĩa, bản ghi DNS, chứng thư TLS và cơ sở dữ liệu đe dọa mạng.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {t('regDecreeTitle', 'Nghị định 13/2023/NĐ-CP & GDPR')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('regDecreeDesc', 'Tôn trọng tuyệt đối quyền của chủ thể dữ liệu (quyền được biết, đồng ý, xóa dữ liệu). Dữ liệu chỉ được xử lý tạm thời in-memory.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {t('regCyberTitle', 'Luật An ninh Mạng & An toàn Thông tin')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('regCyberDesc', 'Phòng ngừa và ngăn chặn mã độc, bẫy lừa đảo phishing. Áp dụng chuẩn mã hóa truyền tải TLS 1.3 và xác thực nguồn an toàn.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {t('regConsumerTitle', 'Bảo vệ Quyền lợi Người tiêu dùng')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('regConsumerDesc', 'Rà soát điều khoản mẫu ToS tìm các điều khoản miễn trừ trách nhiệm vô lý hoặc chuyển đổi rủi ro bất bình đẳng.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {t('regNistTitle', 'NIST Risk Management Framework')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('regNistDesc', 'Đảm bảo mô hình kiểm định có độ tin cậy, an toàn, giải thích được và giảm thiểu sai lệch thiên kiến.')}
            </p>
          </div>
        </div>
      </div>

      {/* PILLAR 2 */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl w-full">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{t('pillar2Tag', 'Trụ cột 2')}</div>
            <h2 className="text-xl font-bold text-white">{t('pillar2Title', 'Phương pháp Vận hành & Động cơ Minh bạch Giải thích được')}</h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {t('pillar2Desc', 'Phân rã độ tin cậy thành An toàn (40%), Minh bạch (30%), Hợp pháp (30%) với cơ chế phạt vi phạm nghiêm trọng (Penalty Gate).')}
        </p>

        {/* Operational Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">1</span>
              {t('step1Title', 'Thu thập & Đối chiếu')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('step1Desc', 'Quét tên miền, bản ghi DNS, chứng chỉ SSL/TLS, nguồn gốc đăng ký và cơ sở dữ liệu các trang web lừa đảo toàn cầu.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
              {t('step2Title', 'Đánh giá Minh bạch')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('step2Desc', 'Phân tích nội dung, rà soát điều khoản hợp đồng ToS tìm cờ đỏ (red flags), kiểm tra bẫy giá giả mạo và trích xuất bằng chứng đối chiếu.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">3</span>
              {t('step3Title', 'Xác nhận & Cấp Báo cáo')}
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('step3Desc', 'Cung cấp Điểm số Tin cậy (Trust Score 0-100), phân loại Rủi ro / An toàn và chuỗi suy luận giải thích được để người dùng quyết định an tâm.')}
            </p>
          </div>
        </div>

        {/* Multi-Model Fallback & Reliability */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            {t('realtimeVerification', 'Thẩm định Thời gian Thực')} — {t('realtimeVerificationSub', 'Phản hồi tính bằng mili-giây')}
          </div>
          <p className="text-slate-400 leading-relaxed">
            {t('realtimeVerificationDesc', 'Hệ thống áp dụng kiến trúc phản hồi tốc độ cao và bộ quy tắc Verity Heuristic Engine để đảm bảo người dùng luôn nhận được báo cáo minh bạch tức thì trong vòng dưới 2 giây.')}
          </p>
        </div>
      </div>

      {/* PILLAR 3 */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">{t('pillar3Tag', 'Trụ cột 3')}</div>
              <h2 className="text-xl font-bold text-white">{t('pillar3Title', 'Bản ghi Kiểm toán Bất biến & Chống Chối bỏ')}</h2>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('copied', 'Đã sao chép') : t('copySummary', 'Sao chép mã')}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {t('pillar3Desc', 'Mỗi kết quả thẩm định được tạo hàm băm mật mã và chữ ký số, cho phép kiểm toán viên và người dùng xác minh tính toàn vẹn độc lập.')}
        </p>

        {/* Code Tabs */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'scoring', label: t('tabSnippetScoring', '1. Thuật toán Tính điểm') },
              { id: 'extension', label: t('tabSnippetExt', '2. Extension Background') },
              { id: 'rules', label: t('tabSnippetRules', '3. Bộ quy tắc ToS') },
              { id: 'api', label: t('tabSnippetApi', '4. Hợp đồng API (/api/scan)') },
              { id: 'pipeline', label: t('tabCodePipeline', '5. Đường ống Siêu tốc <1.2s (Rust/Go)') },
              { id: 'compliance', label: t('tabCodeCompliance', '6. Tuân thủ Pháp luật & Tường lửa') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCodeTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                  activeCodeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <pre className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-mono text-cyan-300 overflow-x-auto max-h-[420px] leading-relaxed w-full shadow-inner">
            {codeSnippets[activeCodeTab]}
          </pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">{t('trustGuarantee', 'Không gắn mã theo dõi / telemetry ngầm')}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-300">{t('zeroKnowledgeSub', 'Mã hóa đa tầng & Bảo mật số')}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-slate-300">{t('footerZeroTrust', 'Kiến trúc Zero-Trust & Giải thích Minh bạch')}</span>
          </div>
        </div>
      </div>

      {/* Quick Tools Access */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 w-full">
        <h3 className="text-base font-bold text-white">{t('needMoreInfo', 'Công cụ Bổ trợ & Tích hợp')}</h3>
        <p className="text-xs text-slate-400">
          {t('processSubtitle', 'Bạn có thể truy cập các tính năng nâng cao bất cứ lúc nào:')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={onOpenExtensionModal}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-left transition space-y-1 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <Chrome className="w-4 h-4" />
              {t('extTitle', 'Tiện ích Trình duyệt Verity')}
            </div>
            <p className="text-[11px] text-slate-400">{t('extSubtitle', 'Bảo vệ thời gian thực trên mọi trình duyệt.')}</p>
          </button>

          <button
            onClick={onOpenOrgModal}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-left transition space-y-1 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <Building2 className="w-4 h-4" />
              {t('orgTitle', 'Cổng Quản trị & Tuân thủ Tổ chức')}
            </div>
            <p className="text-[11px] text-slate-400">{t('orgSubtitle', 'Quản lý thành viên và báo cáo tuân thủ.')}</p>
          </button>

          <button
            onClick={onOpenHistory}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 text-left transition space-y-1 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <History className="w-4 h-4" />
              {t('histTitle', 'Lịch sử Thẩm định & Xác nhận')}
            </div>
            <p className="text-[11px] text-slate-400">{t('histSubtitle', 'Xem lại các báo cáo đã thẩm định gần đây.')}</p>
          </button>
        </div>
      </div>

    </div>
  );
};
