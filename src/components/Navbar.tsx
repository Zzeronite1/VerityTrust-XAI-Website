import React from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Globe, 
  FileCode2,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 'intro' | 'main' | 'explanation';

interface NavbarProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onChangeTab,
}) => {
  const { currentLanguage, openLanguageModal, isTranslating, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onChangeTab('main')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0 select-none"
          title={t('navbarBrandTitle', 'Verity - Nền tảng Thẩm định & Xác nhận Tính Minh bạch')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                {t('appName', 'Verity')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              {t('tagline', 'Nền tảng Xác nhận Tính Minh bạch')}
            </p>
          </div>
        </div>

        {/* CONDENSED BAR: EXACTLY THREE ITEMS (Introduction, Main Website, Detailed Explanation) */}
        <nav 
          aria-label="Navigation Bar" 
          className="flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-inner gap-1"
        >
          {/* Item 1: Introduction */}
          <button
            type="button"
            onClick={() => onChangeTab('intro')}
            className={`flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              currentTab === 'intro'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentTab === 'intro' ? 'text-white' : 'text-blue-400'}`} />
            <span className="hidden sm:inline">{t('navIntro', 'Giới thiệu')}</span>
            <span className="sm:hidden">{t('navIntroShort', 'Intro')}</span>
          </button>

          {/* Item 2: Main Website */}
          <button
            type="button"
            onClick={() => onChangeTab('main')}
            className={`flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              currentTab === 'main'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className={`w-4 h-4 ${currentTab === 'main' ? 'text-white' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">{t('navMain', 'Trang chính')}</span>
            <span className="sm:hidden">{t('navMainShort', 'Main')}</span>
          </button>

          {/* Item 3: Detailed Explanation */}
          <button
            type="button"
            onClick={() => onChangeTab('explanation')}
            className={`flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              currentTab === 'explanation'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileCode2 className={`w-4 h-4 ${currentTab === 'explanation' ? 'text-white' : 'text-cyan-400'}`} />
            <span className="hidden lg:inline">{t('navExplanation', 'Giải thích Chi tiết')}</span>
            <span className="lg:hidden">{t('navExplanationShort', 'Explain')}</span>
          </button>
        </nav>

        {/* 259 LANGUAGES SELECTION OPTION BUTTON & LIVE SYNC STATUS */}
        <div className="flex items-center gap-2 shrink-0">
          {isTranslating && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold animate-pulse">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>{t('translatingLive', 'Đang đồng bộ ngôn ngữ...')}</span>
            </span>
          )}

          <button
            type="button"
            onClick={openLanguageModal}
            className="flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-md shadow-slate-950/40 cursor-pointer group select-none active:scale-95"
            title={`${currentLanguage.name} (${currentLanguage.englishName}) - ${t('selectLanguageTooltip', 'Bấm để chọn từ tất cả các ngôn ngữ thế giới')}`}
            aria-label={t('selectLanguageTooltip', 'Bấm để chọn từ tất cả các ngôn ngữ thế giới')}
          >
            <span className="text-base sm:text-lg leading-none shrink-0" role="img" aria-label={currentLanguage.englishName}>
              {currentLanguage.flag}
            </span>
            <span className="hidden sm:inline text-xs font-bold text-slate-300 group-hover:text-cyan-300 transition-colors max-w-[100px] lg:max-w-[130px] truncate">
              {currentLanguage.name}
            </span>
            <span className="sm:hidden font-mono text-[11px] font-bold text-slate-400 uppercase">
              {currentLanguage.code}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
