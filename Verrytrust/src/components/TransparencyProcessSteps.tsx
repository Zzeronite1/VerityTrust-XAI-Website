import React from 'react';
import { Globe2, Cpu, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TransparencyProcessStepsProps {
  variant?: 'cards' | 'compact' | 'full';
  className?: string;
}

/**
 * Reusable component for the 3-step Transparency Confirmation Process.
 * Eliminates duplicate JSX across App.tsx, DetailedExplanationView.tsx, and IntroductionView.tsx.
 */
export const TransparencyProcessSteps: React.FC<TransparencyProcessStepsProps> = ({
  variant = 'cards',
  className = '',
}) => {
  const { t } = useLanguage();

  const steps = [
    {
      num: 1,
      tag: t('step1Tag', 'Bước 1'),
      title: t('step1Title', 'Thu thập & Đối chiếu'),
      desc: t('step1Desc', 'Quét tên miền, bản ghi DNS, chứng chỉ SSL/TLS, nguồn gốc đăng ký và cơ sở dữ liệu các trang web lừa đảo toàn cầu.'),
      icon: <Globe2 className="w-5 h-5 text-blue-400" />,
      tagColor: 'text-blue-400',
      borderHover: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
      titleHover: 'group-hover:text-blue-300',
      bgIcon: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    },
    {
      num: 2,
      tag: t('step2Tag', 'Bước 2'),
      title: t('step2Title', 'Đánh giá Minh bạch'),
      desc: t('step2Desc', 'Phân tích nội dung, rà soát điều khoản hợp đồng ToS tìm cờ đỏ (red flags), kiểm tra bẫy giá giả mạo và trích xuất bằng chứng đối chiếu.'),
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      tagColor: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
      titleHover: 'group-hover:text-cyan-300',
      bgIcon: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      num: 3,
      tag: t('step3Tag', 'Bước 3'),
      title: t('step3Title', 'Xác nhận & Cấp Báo cáo'),
      desc: t('step3Desc', 'Cung cấp Điểm số Tin cậy (Trust Score 0-100), phân loại Rủi ro / An toàn và chuỗi suy luận giải thích được để người dùng quyết định an tâm.'),
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      tagColor: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
      titleHover: 'group-hover:text-emerald-300',
      bgIcon: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-xs ${className}`}>
        {steps.map((step) => (
          <div key={step.num} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className={`font-bold ${step.tagColor} flex items-center gap-1.5`}>
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">
                {step.num}
              </span>
              {step.title}
            </div>
            <p className="text-slate-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {steps.map((step) => (
        <div
          key={step.num}
          className={`group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 ${step.borderHover} hover:bg-slate-900/90 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 space-y-3.5 backdrop-blur-md`}
        >
          <div className={`w-11 h-11 rounded-xl ${step.bgIcon} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
            {step.icon}
          </div>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${step.tagColor}`}>{step.tag}</div>
          <h4 className={`font-bold text-white text-base ${step.titleHover} transition-colors`}>
            {step.title}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
        </div>
      ))}
    </div>
  );
};

