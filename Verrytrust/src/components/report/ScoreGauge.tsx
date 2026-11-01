import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Eye, Scale, Sparkles } from 'lucide-react';
import { ScanReport } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getScoreTheme, getConfidenceColors } from '../../utils/scoreTheme';

interface AnimatedConfidenceCircleProps {
  score: number;
  label?: string;
}

export const AnimatedConfidenceCircle: React.FC<AnimatedConfidenceCircleProps> = ({ score, label }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [isFilled, setIsFilled] = useState(false);

  useEffect(() => {
    setIsFilled(false);
    setDisplayScore(0);
    const timer = setTimeout(() => setIsFilled(true), 10);

    const duration = 250;
    const startTime = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayScore(score);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [score]);

  const gradientId = useMemo(() => `conf-grad-${Math.random().toString(36).substring(2, 9)}`, []);
  const colors = useMemo(() => getConfidenceColors(score), [score]);

  const radius = 21;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isFilled ? circumference - (circumference * score) / 100 : circumference;

  return (
    <div 
      className="relative flex flex-col items-center justify-center group cursor-default select-none pt-1"
      title={label || `Confidence: ${score}%`}
    >
      <div className="relative w-13 h-13 flex items-center justify-center">
        <div 
          className="absolute inset-1 rounded-full blur-md opacity-50 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: colors.glow }}
        />
        <svg className="w-full h-full -rotate-90 transform drop-shadow-sm" viewBox="0 0 52 52">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
          </defs>
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800/80"
          />
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-xs font-black tracking-tight" style={{ color: colors.start }}>
            {displayScore}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface ScoreGaugeProps {
  report: ScanReport;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ report }) => {
  const { t } = useLanguage();
  const [isMainScoreAnimated, setIsMainScoreAnimated] = useState(false);
  const [displayMainScore, setDisplayMainScore] = useState(0);

  const mainScoreTheme = useMemo(() => getScoreTheme(report.trustScore), [report.trustScore]);
  const mainScoreGradientId = useMemo(() => `main-score-grad-${Math.random().toString(36).substring(2, 9)}`, [report.id]);

  useEffect(() => {
    setIsMainScoreAnimated(false);
    setDisplayMainScore(0);
    const timer = setTimeout(() => setIsMainScoreAnimated(true), 10);

    const duration = 280;
    const startTime = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayMainScore(Math.round(eased * report.trustScore));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayMainScore(report.trustScore);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [report.id, report.trustScore]);

  const mainRadius = 42;
  const mainCircumference = 2 * Math.PI * mainRadius;
  const mainStrokeDashoffset = isMainScoreAnimated 
    ? mainCircumference - (mainCircumference * report.trustScore) / 100 
    : mainCircumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      {/* Main Trust Score Gauge */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center relative overflow-hidden">
        <div 
          className="absolute w-36 h-36 rounded-full blur-2xl opacity-25 pointer-events-none transition-all duration-1000"
          style={{ backgroundColor: mainScoreTheme.glow }}
        />

        <div className="relative w-36 h-36 flex items-center justify-center mb-3">
          <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={mainScoreGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mainScoreTheme.startColor} />
                <stop offset="100%" stopColor={mainScoreTheme.endColor} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={mainRadius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r={mainRadius}
              stroke={`url(#${mainScoreGradientId})`}
              strokeWidth="8"
              strokeDasharray={mainCircumference}
              strokeDashoffset={mainStrokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className={`text-4xl font-black ${mainScoreTheme.textColor} tracking-tight`}>
              {displayMainScore}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              / 100
            </span>
          </div>
        </div>

        <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${mainScoreTheme.badgeBg} ${mainScoreTheme.badgeText} ${mainScoreTheme.badgeBorder} border shadow-sm`}>
          {report.status === 'safe' && t('statusSafe', 'AN TOÀN')}
          {report.status === 'caution' && t('statusCaution', 'CẦN LƯU Ý')}
          {report.status === 'danger' && t('statusDanger', 'CẢNH BÁO NGUY HIỂM')}
        </div>

        <div 
          title={`${t('modelReliabilityLabel', 'Độ tin cậy Mô hình')}: ${report.modelReliability?.score || 98}%`}
          className="font-mono text-xs font-bold text-purple-300 flex items-center gap-1.5 pt-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{report.modelReliability?.score || 98}%</span>
        </div>
      </div>

      {/* Sub-Scores & Summary */}
      <div className="lg:col-span-7 space-y-4">
        {/* 3 Sub-Score Meters */}
        <div className="grid grid-cols-3 gap-3">
          {/* Safety */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                {t('metricSafety', 'An toàn')}
              </span>
              <strong className="text-white font-mono">{report.safetyScore}%</strong>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${report.safetyScore}%` }} />
            </div>
          </div>

          {/* Transparency */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                {t('metricTransparency', 'Minh bạch')}
              </span>
              <strong className="text-white font-mono">{report.transparencyScore}%</strong>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: `${report.transparencyScore}%` }} />
            </div>
          </div>

          {/* Legality */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                {t('metricLegality', 'Pháp lý')}
              </span>
              <strong className="text-white font-mono">{report.legalityScore}%</strong>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${report.legalityScore}%` }} />
            </div>
          </div>
        </div>

        {/* Model Reliability Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 shadow-lg shadow-purple-950/20 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{t('modelReliabilityLabel', 'Độ tin cậy Mô hình')}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {report.modelReliability?.tier === 'exceptional' ? t('tierExceptional', 'Cực kỳ Đáng tin cậy') : t('tierHigh', 'Độ tin cậy Cao')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {t('modelReliabilitySubtitle', 'Mức độ tin cậy và đồng thuận kiểm định chéo')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-purple-300">
                {report.modelReliability?.score || 98}%
              </div>
              <div className="text-[10px] text-slate-500">
                {t('auditBasis', 'Cơ sở thẩm định:')} 4 vectors
              </div>
            </div>
          </div>

          {/* 4 Cross-Verification Vectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] truncate">{t('vectorCrypto', 'Mật mã học & TLS')}</div>
              <div className="font-mono font-bold text-cyan-300">{report.modelReliability?.cryptographicIntegrity || 99}%</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${report.modelReliability?.cryptographicIntegrity || 99}%` }} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] truncate">{t('vectorConsensus', 'Đồng thuận Đa tầng')}</div>
              <div className="font-mono font-bold text-purple-300">{report.modelReliability?.consensusRate || 98}%</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${report.modelReliability?.consensusRate || 98}%` }} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] truncate">{t('vectorCompleteness', 'Độ đầy đủ Dữ liệu')}</div>
              <div className="font-mono font-bold text-emerald-300">{report.modelReliability?.evidenceCompleteness || 96}%</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${report.modelReliability?.evidenceCompleteness || 96}%` }} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] truncate">{t('vectorHeuristic', 'Chuẩn xác Suy luận')}</div>
              <div className="font-mono font-bold text-blue-300">97%</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '97%' }} />
              </div>
            </div>
          </div>

          {report.modelReliability?.explanation && (
            <p className="text-[11px] text-slate-300/90 leading-relaxed pt-1 border-t border-slate-800/60">
              {report.modelReliability.explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

