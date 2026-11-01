import React, { useState } from 'react';
import { 
  UserCheck, 
  Calendar, 
  AlertOctagon, 
  CheckCircle2, 
  FileCheck2, 
  Scale, 
  FileText, 
  ExternalLink, 
  FileDown, 
  CreditCard 
} from 'lucide-react';
import { ScanReport } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_MATERIALS_SCOPE, DEFAULT_LEGAL_BASIS } from '../../data/reportConstants';

interface AgeEvaluationSectionProps {
  report: ScanReport;
}

export const AgeEvaluationSection: React.FC<AgeEvaluationSectionProps> = ({ report }) => {
  const { t } = useLanguage();

  const [userBirthYearInput, setUserBirthYearInput] = useState<string>(() => {
    return localStorage.getItem('verity_user_birth_year') || (report.userBirthYear ? String(report.userBirthYear) : '2006');
  });

  const currentYear = new Date().getFullYear();
  const parsedBirthYear = parseInt(userBirthYearInput, 10);
  const isValidBirthYear = !isNaN(parsedBirthYear) && parsedBirthYear >= 1920 && parsedBirthYear <= currentYear;
  const userAge = isValidBirthYear ? currentYear - parsedBirthYear : null;

  const minRequiredAge = report.ageAppropriateness?.minimumAge ?? 0;
  const isRestrictedForUser = userAge !== null && userAge < minRequiredAge;

  const handleBirthYearChange = (year: string) => {
    setUserBirthYearInput(year);
    if (year && !isNaN(parseInt(year, 10))) {
      localStorage.setItem('verity_user_birth_year', year);
    }
  };

  const materialsScope = report.ageAppropriateness?.materialsScope || DEFAULT_MATERIALS_SCOPE;
  const legalBasis = report.ageAppropriateness?.legalBasis || DEFAULT_LEGAL_BASIS;

  return (
    <div className="pt-6 border-t border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <UserCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{t('subSecAgeTitle', 'Độ tuổi Phù hợp & Tiêu chuẩn Tiếp cận Nội dung, Tài liệu')}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {report.ageAppropriateness?.targetCategory || 'Thông tin & Dịch vụ'}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {t('subSecAgeDesc', 'Đánh giá tính phù hợp lứa tuổi đối với trang web và các bài viết, liên kết, tài liệu tải về hoặc dịch vụ.')}
            </p>
          </div>
        </div>

        {/* Official Age Rating Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">{t('lblRatingStandard', 'Xếp hạng:')}</span>
          <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border shadow-sm transition-all duration-300 ${
            report.ageAppropriateness?.ratingCode === 'ALL'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : report.ageAppropriateness?.ratingCode === '13+'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : report.ageAppropriateness?.ratingCode === '15+' || report.ageAppropriateness?.ratingCode === '16+'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-red-500/25 text-red-300 border-red-500/50'
          }`}>
            {report.ageAppropriateness?.ratingLabel || 'Mọi lứa tuổi (All Ages)'}
          </span>
        </div>
      </div>

      {/* Interactive User Birth Year Checker Form */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>{t('lblEnterBirthYear', 'Nhập năm sinh của bạn để kiểm định độ tuổi phù hợp:')}</span>
          </div>
          
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">{t('lblQuickPick', 'Chọn nhanh:')}</span>
            {[
              { year: '2015', label: `2015 (11${t('shortAgeSuffix', 't')})` },
              { year: '2010', label: `2010 (16${t('shortAgeSuffix', 't')})` },
              { year: '2000', label: `2000 (26${t('shortAgeSuffix', 't')})` },
            ].map((preset) => (
              <button
                key={preset.year}
                type="button"
                onClick={() => handleBirthYearChange(preset.year)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  userBirthYearInput === preset.year
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-44">
            <input
              type="number"
              min="1920"
              max={currentYear}
              placeholder={t('birthYearPlaceholder', 'VD: 2008')}
              value={userBirthYearInput}
              onChange={(e) => handleBirthYearChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {isValidBirthYear && userAge !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">
                {t('lblCalculatedAge', 'Độ tuổi tính toán:')} <strong className="font-mono text-cyan-300 text-sm">{userAge} {t('lblYearsOld', 'tuổi')}</strong>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                ({userAge >= 18 ? t('ageGroupAdult', 'Người trưởng thành 18+') : (userAge >= 15 ? t('ageGroupTeen15', 'Vị thành niên 15-17') : (userAge >= 13 ? t('ageGroupTeen13', 'Thanh thiếu niên 13-14') : t('ageGroupChild', 'Trẻ em <13')))})
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-400 italic">
              {t('lblInvalidBirthYear', 'Vui lòng nhập năm sinh hợp lệ (VD: 2008)')}
            </span>
          )}
        </div>

        {/* Dynamic Result Banner */}
        {isValidBirthYear && userAge !== null && (
          <div className="pt-1">
            {isRestrictedForUser ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/80 via-amber-950/50 to-slate-900 border border-amber-500/70 shadow-lg shadow-amber-950/30 space-y-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                    <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-red-300 uppercase tracking-wide">
                        🚨 {t('alertAgeRestrictedTitle', 'CẢNH BÁO: NỘI DUNG GIỚI HẠN ĐỘ TUỔI')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                        {t('lblRequiresAge', 'YÊU CẦU')} {minRequiredAge}+ {t('lblYearsOldUpper', 'TUỔI')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {t('alertAgeRestrictedBody', 'Bạn hiện')} <strong>{userAge} {t('lblYearsOld', 'tuổi')}</strong> {t('alertAgeRestrictedBodyYear', '(sinh năm')} {parsedBirthYear}). {report.ageAppropriateness?.rationale}
                    </p>
                    <p className="text-[11px] text-amber-300/90 font-medium">
                      ⚠️ {report.ageAppropriateness?.advisoryForMinors}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/60 border border-emerald-500/60 shadow-lg shadow-emerald-950/30 space-y-1.5 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wide">
                        ✅ {t('alertAgeAppropriateTitle', 'ĐẠT TIÊU CHUẨN ĐỘ TUỔI SỬ DỤNG HỢP PHÁP')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        {userAge} {t('lblYearsOldUpper', 'TUỔI')} / {minRequiredAge}+
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {t('alertAgeAppropriateBody', 'Bạn hiện')} <strong>{userAge} {t('lblYearsOld', 'tuổi')}</strong> {t('alertAgeAppropriateBodySuffix', 'và hoàn toàn đủ điều kiện theo quy định của pháp luật để tiếp cận, tham khảo thông tin và sử dụng các tài nguyên, dịch vụ được cấp phép trên trang web này.')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {report.ageAppropriateness?.rationale}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4 Materials & Content Categories Cards */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            <span>{t('materialsScopeTitle', 'Chi tiết phạm vi liên kết, bài viết và tài liệu được tiếp cận:')}</span>
          </span>
          <span className="text-[11px] text-slate-500">4 {t('resourceGroupsCount', 'nhóm tài nguyên')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {materialsScope.map((item, idx) => {
            const isItemRestricted = userAge !== null && userAge < item.allowedAgeMin;
            return (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl border transition-all duration-300 space-y-2 ${
                  item.safetyStatus === 'prohibited'
                    ? 'bg-red-950/30 border-red-500/40'
                    : isItemRestricted
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.category === 'articles_news' && <FileText className="w-4 h-4 text-blue-400" />}
                    {item.category === 'hyperlinks_redirects' && <ExternalLink className="w-4 h-4 text-cyan-400" />}
                    {item.category === 'downloadable_materials' && <FileDown className="w-4 h-4 text-emerald-400" />}
                    {item.category === 'financial_transactions' && <CreditCard className="w-4 h-4 text-purple-400" />}
                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    item.safetyStatus === 'prohibited'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : isItemRestricted
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : item.safetyStatus === 'safe_all'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {item.allowedAgeMin === 0 ? t('allAgesShort', 'Mọi lứa tuổi') : `${item.allowedAgeMin}+`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {item.description}
                </p>

                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 italic truncate">{item.guidelines}</span>
                  {isItemRestricted ? (
                    <span className="text-amber-400 font-bold shrink-0">{t('statusNeedsSupervision', '⚠️ Cần giám sát')}</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold shrink-0">{t('statusAllowed', '✓ Được phép')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legal Statutes Footnotes */}
      <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-300 flex items-center gap-1">
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('lblLegalStatutes', 'Căn cứ Pháp lý & Tiêu chuẩn Bảo vệ Trẻ em:')}</span>
        </span>
        {legalBasis.map((law, idx) => (
          <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">
            {law}
          </span>
        ))}
      </div>
    </div>
  );
};

