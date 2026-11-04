import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  Cpu, 
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface IntroductionViewProps {
  onGoToMain: () => void;
  onGoToExplanation: () => void;
}

export const IntroductionView: React.FC<IntroductionViewProps> = ({
  onGoToMain,
  onGoToExplanation,
}) => {
  const { t } = useLanguage();

  return (
    <div className="w-full space-y-8 lg:space-y-10 animate-page-enter py-2">
      
      {/* Hero Banner */}
      <div className="text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('introHeroBadge', 'Tổng quan & Mục tiêu Dự án Verity')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-[1.25] font-display">
          {t('introTitle', 'Nền tảng Thẩm định An toàn,')} <br className="hidden sm:inline" />
          <span className="animate-gradient-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            {t('introTitleGradient', 'Minh bạch & Tuân thủ Pháp lý')}
          </span>
        </h1>
        <p className="text-xs sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl mx-auto">
          {t('introDesc', 'Verity cho phép cá nhân và doanh nghiệp xác minh tức thì độ an toàn, tính minh bạch và tuân thủ pháp lý của bất kỳ thực thể số nào.')}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onGoToMain}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition flex items-center gap-2 cursor-pointer"
          >
            <span>{t('introBtnMain', 'Đến Trang chính Tra cứu (Main Website)')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onGoToExplanation}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {t('introBtnExplanation', 'Xem Giải thích Chi tiết Động cơ (Detailed Explanation)')}
          </button>
        </div>
      </div>

      {/* Core Differentiator: Explainable Verification */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-700/80 shadow-2xl space-y-4 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('diffTitle', 'Điểm khác biệt Cốt lõi: Minh bạch Giải thích được — Không Hộp đen')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('diffDesc', 'Cung cấp lý do, bằng chứng và chuỗi lập luận nguyên nhân - kết quả rõ ràng, thay vì một điểm số trừu tượng')}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {t('diffBody', 'Phần lớn các công cụ kiểm tra thông thường chỉ trả về một chỉ số "An toàn" hoặc "Nguy hiểm" mà không giải thích vì sao. Verity ứng dụng cơ chế giải thích minh bạch để phân rã điểm số thành 3 trụ cột độc lập, giải thích cặn kẽ từng dấu hiệu rủi ro (red flags), trích xuất nguyên văn điều khoản bất lợi và đưa ra khuyến nghị hành động cụ thể.')}
        </p>
      </div>

      {/* Target Audiences (3 Groups) */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">{t('audienceTitle', 'Đối tượng Phục vụ & Trường hợp Sử dụng')}</h2>
          <p className="text-xs text-slate-400">{t('audienceSubtitle', 'Thiết kế tối ưu cho 3 nhóm đối tượng người dùng chính')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Audience 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t('aud1Title', 'Cộng đồng Người dùng Phổ thông')}</h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{t('aud1Point1', 'Kiểm tra xem trang web hoặc đường link có phải lừa đảo (phishing) hay không.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{t('aud1Point2', 'Xác minh cửa hàng online, trang mua sắm có uy tín hay mạo danh thương hiệu.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{t('aud1Point3', 'Kiểm tra thông tin trên mạng xã hội có phải tin giả (fake news) hoặc hình ảnh deepfake.')}</span>
              </li>
            </ul>
          </div>

          {/* Audience 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t('aud2Title', 'Doanh nghiệp vừa và nhỏ (SME)')}</h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{t('aud2Point1', 'Rà soát đối tác cung cấp dịch vụ trực tuyến trước khi ký kết hoặc chuyển tiền.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{t('aud2Point2', 'Tự kiểm toán website của công ty xem có vi phạm quy định bảo vệ dữ liệu hay không.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{t('aud2Point3', 'Bảo vệ uy tín thương hiệu khỏi các trang web giả mạo tên miền công ty.')}</span>
              </li>
            </ul>
          </div>

          {/* Audience 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">{t('aud3Title', 'Cơ quan & Tổ chức Bảo vệ Người dùng')}</h3>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('aud3Point1', 'Kiểm tra mức độ tuân thủ bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP và GDPR.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('aud3Point2', 'Đối chiếu các điều khoản bất lợi, bẫy chữ nhỏ trong hợp đồng trực tuyến và ToS.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('aud3Point3', 'Lưu trữ bằng chứng kiểm toán độc lập, chống chối bỏ với mã băm toàn vẹn.')}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* 3 Pillars Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            1. {t('metricSafety', 'Độ An toàn')}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('step1Desc', 'Quét tên miền, bản ghi DNS, chứng chỉ SSL/TLS, nguồn gốc đăng ký và cơ sở dữ liệu các trang web lừa đảo toàn cầu.')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Eye className="w-4 h-4" />
            2. {t('metricTransparency', 'Tính Minh bạch')}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('step2Desc', 'Phân tích nội dung, rà soát điều khoản hợp đồng ToS tìm cờ đỏ (red flags), kiểm tra bẫy giá giả mạo và trích xuất bằng chứng đối chiếu.')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Scale className="w-4 h-4" />
            3. {t('metricLegality', 'Tính Hợp pháp')}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('step3Desc', 'Cung cấp Điểm số Tin cậy (Trust Score 0-100), phân loại Rủi ro / An toàn và chuỗi suy luận giải thích được để người dùng quyết định an tâm.')}
          </p>
        </div>
      </div>

    </div>
  );
};
