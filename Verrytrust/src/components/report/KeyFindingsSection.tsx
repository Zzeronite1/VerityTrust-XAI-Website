import React from 'react';
import { HelpCircle, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { ScanReport } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface KeyFindingsSectionProps {
  report: ScanReport;
}

export const KeyFindingsSection: React.FC<KeyFindingsSectionProps> = ({ report }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {t('whyHeadline', 'Tại sao lại thế? (Lý giải minh bạch)')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('whySubhead', 'Các phát hiện chính và nguyên nhân cấu thành điểm số')}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          {report.keyFindings?.length || 0} {t('keyFindings', 'phát hiện')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {report.keyFindings?.map((finding, idx) => (
          <div 
            key={idx}
            className={`p-4 rounded-2xl border transition flex items-start gap-3 ${
              finding.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
              finding.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              finding.severity === 'low' ? 'bg-blue-500/10 border-blue-500/20' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {finding.severity === 'high' && <ShieldAlert className="w-5 h-5 text-red-400" />}
              {finding.severity === 'medium' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {finding.severity === 'low' && <Info className="w-5 h-5 text-blue-400" />}
              {finding.severity === 'safe' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">
                  {finding.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                    {finding.category === 'safety' ? t('catSafety', 'An toàn') :
                     finding.category === 'transparency' ? t('catTransparency', 'Minh bạch') :
                     finding.category === 'legality' ? t('catLegality', 'Pháp lý') :
                     finding.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    finding.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                    finding.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {finding.impact}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {finding.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

