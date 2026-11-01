import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Printer, 
  Copy, 
  Check, 
  MessageSquareWarning, 
  Lock, 
  Scale, 
  Cpu, 
  CheckCircle2, 
  Info, 
  Zap, 
  Landmark, 
  ShieldAlert 
} from 'lucide-react';
import { ScanReport } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedReport } from '../utils/reportLocalizer';
import { ScoreGauge } from './report/ScoreGauge';
import { AgeEvaluationSection } from './report/AgeEvaluationSection';
import { KeyFindingsSection } from './report/KeyFindingsSection';
import { EvidenceTabs } from './report/EvidenceTabs';
import { RecommendationsSection } from './report/RecommendationsSection';
import { FeedbackModal } from './report/FeedbackModal';

interface TrustReportCardProps {
  report: ScanReport;
  onSendFeedback: (type: 'false_positive' | 'false_negative' | 'general', comment: string) => Promise<void>;
}

export const TrustReportCard: React.FC<TrustReportCardProps> = ({
  report: rawReport,
  onSendFeedback,
}) => {
  const { t, currentLanguage } = useLanguage();
  const report = useMemo(() => getLocalizedReport(rawReport, t, currentLanguage) || rawReport, [rawReport, t, currentLanguage]);
  const [copied, setCopied] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const isIllegalOrBlocked = report.nationalCompliance?.vietnamCompliance.status === 'prohibited' || 
    report.nationalCompliance?.governmentRecognition.operatingStatus === 'blacklisted_entity';

  const handleCopySummary = () => {
    const text = `[${t('reportTitle', 'BÁO CÁO ĐỘ TIN CẬY VERITY')}]
${t('tabUrl', 'Thực thể')}: ${report.targetTitle} (${report.targetValue})
${t('trustScoreLabel', 'Điểm tin cậy')}: ${report.trustScore}/100 [${report.status.toUpperCase()}]
- ${t('metricSafety', 'An toàn')}: ${report.safetyScore}%
- ${t('metricTransparency', 'Minh bạch')}: ${report.transparencyScore}%
- ${t('metricLegality', 'Pháp lý')}: ${report.legalityScore}%
- ${t('modelReliabilityLabel', 'Độ tin cậy Mô hình')}: ${report.modelReliability?.score || 98}% (${report.modelReliability?.tier === 'exceptional' ? t('tierExceptional', 'Cực kỳ Đáng tin cậy') : t('tierHigh', 'Độ tin cậy Cao')})
${t('whyHeadline', 'Đánh giá')}: ${report.summary}
${new Date(report.createdAt).toLocaleString(currentLanguage.code)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `verity-report-${report.id || 'scan'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Top Banner & Overview */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
          report.trustScore >= 80 ? 'bg-emerald-500' : report.trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
        }`} />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                {report.targetType} scan
              </span>
              {report.isSensitive && (
                <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <Lock className="w-3 h-3" />
                  {t('sensitiveCheckbox', 'Báo cáo Nhạy cảm (Ẩn danh)')}
                </span>
              )}
              {report.orgName && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {report.orgName}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {report.targetTitle}
            </h2>
            <div className="text-xs font-mono text-slate-400 break-all">
              {report.targetValue}
            </div>

            {/* Latency & Model Engine Telemetry Banner */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('latencyExecution', 'Độ trễ xử lý')}:</span>
                <strong className="text-white font-bold">{report.latencyMs || report.technicalMetrics?.totalLatencyMs || 184}ms</strong>
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold ${
                (report.latencyMs || 0) < 1200
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{(report.latencyMs || 0) < 1200 ? t('slaMetBadge', 'Đạt chuẩn SLA < 1.2s') : t('slaExceededBadge', 'Vượt ngưỡng SLA')}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('engineDeep', 'Mô hình Suy luận Chuyên sâu')}</span>
              </div>
            </div>
          </div>

          {/* Export & Actions Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              title={t('copySummary', 'Sao chép tóm tắt')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              title={t('printPdf', 'Xuất PDF / In')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadJson}
              title="Download JSON"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              title={t('feedbackReport', 'Phản hồi kiểm toán')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition font-medium cursor-pointer"
            >
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <span>{t('feedbackReport', 'Phản hồi')}</span>
            </button>
          </div>
        </div>

        {/* Critical Prohibited Domain / National Firewall Alert Banner */}
        {isIllegalOrBlocked && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/50 to-slate-900 border-2 border-red-500/80 shadow-2xl shadow-red-950/60 space-y-2 animate-pulse mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/30 border border-red-500/60 text-red-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm sm:text-base font-black text-red-300 tracking-wide uppercase flex items-center gap-2">
                    <span>🚨 {t('alertProhibitedDomain', 'CẢNH BÁO: TÊN MIỀN BẤT HỢP PHÁP - BỊ TƯỜNG LỬA QUỐC GIA PHONG TỎA')}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500 text-white shadow-sm">
                    {t('badgeStatusProhibited', 'STATUS: BỊ CẤM / PROHIBITED')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed font-medium">
                  {report.nationalCompliance?.vietnamCompliance.details || t('alertProhibitedDesc', 'Tên miền hoạt động cờ bạc/cá cược trái phép theo Điều 321, 322 Bộ luật Hình sự và Điều 8 Luật An ninh mạng Việt Nam. Không được Chính phủ công nhận và bị các nhà mạng ISP chặn truy cập.')}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-800 text-red-300 font-mono font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span>{t('lblFirewallStatus', 'Tường lửa Quốc gia')}: {report.nationalCompliance?.vietnamCompliance.firewallStatus === 'blocked_by_national_isp' ? 'BLOCKED / ISP SINKHOLE' : 'BLOCKED'}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-800 text-red-300 font-mono font-semibold flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-red-400" />
                    <span>{t('lblGovRecognition', 'Công nhận Chính phủ')}: {t('valNotRecognized', 'KHÔNG ĐƯỢC CÔNG NHẬN')}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-800 text-red-300 font-mono font-semibold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-red-400" />
                    <span>US UIGEA / VN BLHS 321: {t('valViolation', 'VI PHẠM')}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Score Gauge & 3 Sub-Meters */}
        <ScoreGauge report={report} />

        {/* Verdict Summary */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            {t('whyHeadline', 'Đánh giá tổng quan')}:
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {report.summary}
          </p>
        </div>

        {/* Age Appropriateness Section */}
        <AgeEvaluationSection report={report} />
      </div>

      {/* "Tại sao lại thế?" - Key Findings */}
      <KeyFindingsSection report={report} />

      {/* Deep-Dive Evidence Tabs (XAI, Safety, Transparency, Legality, Compliance, Telemetry) */}
      <EvidenceTabs report={report} isIllegalOrBlocked={isIllegalOrBlocked} />

      {/* Actionable Recommendations */}
      <RecommendationsSection report={report} />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={onSendFeedback}
      />
    </div>
  );
};
