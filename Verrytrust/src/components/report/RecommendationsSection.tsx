import React from 'react';
import { FileCheck2, ChevronRight } from 'lucide-react';
import { ScanReport } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface RecommendationsSectionProps {
  report: ScanReport;
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({ report }) => {
  const { t } = useLanguage();

  if (!report.recommendations || report.recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <FileCheck2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {t('recommendations', 'Khuyến nghị Hành động')}
          </h3>
          <p className="text-xs text-slate-400">
            {t('recommendationsSubtitle', 'Các bước cụ thể được đề xuất nhằm bảo vệ an toàn, giảm thiểu rủi ro và tuân thủ')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {report.recommendations.map((rec, idx) => (
          <div 
            key={idx}
            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
          >
            <div className="mt-0.5">
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{rec.action}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  rec.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                  rec.priority === 'recommended' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {rec.priority === 'urgent'
                    ? t('priorityUrgent', 'Khẩn cấp')
                    : rec.priority === 'recommended'
                    ? t('priorityRecommended', 'Khuyến nghị')
                    : t('priorityOptional', 'Tùy chọn')}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">{rec.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

