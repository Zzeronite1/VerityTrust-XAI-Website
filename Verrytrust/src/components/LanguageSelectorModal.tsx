import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Globe, 
  Search, 
  X, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Clock, 
  Flame 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../data/languages';

type RegionFilter = 'all' | 'recent' | 'popular' | 'asia' | 'europe' | 'americas' | 'africa' | 'middle-east' | 'oceania';

export const LanguageSelectorModal: React.FC = () => {
  const { 
    currentLanguage, 
    setLanguage, 
    prefetchLanguage,
    isLanguageModalOpen, 
    closeLanguageModal, 
    availableLanguages,
    recentLanguages,
    t
  } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('all');
  const [visibleCount, setVisibleCount] = useState(48);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverPrefetch = (lang: Language) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      prefetchLanguage(lang);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLanguageModalOpen) {
        closeLanguageModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLanguageModalOpen, closeLanguageModal]);

  // Reset search when modal opens
  useEffect(() => {
    if (isLanguageModalOpen) {
      setSearchQuery('');
      setSelectedRegion('all');
      setVisibleCount(48);
    }
  }, [isLanguageModalOpen]);

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(48);
  }, [searchQuery, selectedRegion]);

  // Filter languages
  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // 1. If recent tab selected
    if (selectedRegion === 'recent') {
      return recentLanguages.filter((lang) => {
        if (!query) return true;
        return (
          lang.name.toLowerCase().includes(query) ||
          lang.englishName.toLowerCase().includes(query) ||
          lang.code.toLowerCase().includes(query)
        );
      });
    }

    return availableLanguages.filter((lang) => {
      // Region filter
      if (selectedRegion === 'popular' && !lang.popular) return false;
      if (selectedRegion !== 'all' && selectedRegion !== 'popular' && lang.region !== selectedRegion) {
        return false;
      }

      // Search query
      if (!query) return true;
      return (
        lang.name.toLowerCase().includes(query) ||
        lang.englishName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
      );
    });
  }, [availableLanguages, recentLanguages, searchQuery, selectedRegion]);

  if (!isLanguageModalOpen) return null;

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    closeLanguageModal();
  };

  const regionTabs: { id: RegionFilter; label: string; icon?: React.ReactNode; count?: number }[] = [
    { id: 'all', label: t('filterAll', 'Tất cả'), count: availableLanguages.length },
    { id: 'recent', label: t('filterRecent', 'Vừa dùng'), icon: <Clock className="w-3 h-3 text-cyan-400" />, count: recentLanguages.length },
    { id: 'popular', label: t('filterPopular', 'Phổ biến'), icon: <Flame className="w-3 h-3 text-amber-400" /> },
    { id: 'asia', label: t('filterAsia', 'Châu Á') },
    { id: 'europe', label: t('filterEurope', 'Châu Âu') },
    { id: 'americas', label: t('filterAmericas', 'Châu Mỹ') },
    { id: 'africa', label: t('filterAfrica', 'Châu Phi') },
    { id: 'middle-east', label: t('filterMiddleEast', 'Trung Đông') },
    { id: 'oceania', label: t('filterOceania', 'Châu Đại Dương') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Dialog Card */}
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="language-modal-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {t('selectLanguageTitle', 'Chọn Ngôn ngữ (259 Ngôn ngữ Quốc tế)')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                  {availableLanguages.length} {t('languagesAvailable', 'ngôn ngữ khả dụng')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('langModalSubtitle', 'Tất cả các phần của trang web sẽ được đồng bộ theo ngôn ngữ bạn chọn')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeLanguageModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Region Filter Tabs */}
        <div className="p-4 sm:p-6 border-b border-slate-800/60 bg-slate-950/40 space-y-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchLanguagePlaceholder', 'Tìm kiếm ngôn ngữ (ví dụ: Tiếng Việt, English, vi, en)...')}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm text-white placeholder-slate-500 transition outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {regionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRegion(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedRegion === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[10px] text-slate-500 font-mono">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recently Used Section (when query is empty and region is 'all') */}
        {!searchQuery && selectedRegion === 'all' && recentLanguages.length > 0 && (
          <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-800/40 bg-slate-950/20">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('filterRecent', 'Ngôn ngữ vừa dùng')}</span>
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              {recentLanguages.map((lang) => {
                const isSelected = currentLanguage.code === lang.code;
                return (
                  <button
                    key={`recent-${lang.code}`}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    onMouseEnter={() => handleHoverPrefetch(lang)}
                    onMouseLeave={handleMouseLeave}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-500/15'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{lang.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language Grid: Scrollable List (Optimized window rendering for low-end devices) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[50vh]">
          {filteredLanguages.length === 0 ? (
            <div className="col-span-full py-12 text-center space-y-2">
              <Globe className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {t('noLanguagesFound', 'Không tìm thấy ngôn ngữ phù hợp')}
              </p>
              <p className="text-xs text-slate-500">
                {t('trySearchHint', 'Hãy thử tìm theo tên tiếng Anh, tên bản địa hoặc mã ISO')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRegion('all');
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('btnResetFilter', 'Đặt lại bộ lọc')}</span>
              </button>
            </div>
          ) : (
            <>
              {filteredLanguages.slice(0, visibleCount).map((lang) => {
                const isSelected = currentLanguage.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    onMouseEnter={() => handleHoverPrefetch(lang)}
                    onMouseLeave={handleMouseLeave}
                    className={`p-3 rounded-2xl text-left flex items-center justify-between gap-3 border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600/25 via-cyan-500/20 to-blue-600/25 border-cyan-400 shadow-md shadow-cyan-500/15'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl select-none shrink-0" role="img" aria-label={lang.englishName}>
                        {lang.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-200' : 'text-white group-hover:text-cyan-300'}`}>
                            {lang.name}
                          </span>
                          {lang.code === 'vi' && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-black shrink-0">
                              {t('badgeOriginal', 'GỐC')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {lang.englishName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {lang.code}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {visibleCount < filteredLanguages.length && (
                <div className="col-span-full pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 font-semibold transition cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <span>{t('btnLoadMore', 'Xem thêm')} ({filteredLanguages.length - visibleCount} {t('languagesAvailable', 'ngôn ngữ')})</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {t('showingLanguagesPrefix', 'Hiển thị')} <strong className="text-white">{filteredLanguages.length}</strong> / <strong>{availableLanguages.length}</strong> {t('languagesAvailable', 'ngôn ngữ khả dụng')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 hidden sm:inline">{t('quickSelect', 'Chọn nhanh:')}</span>
            <button
              type="button"
              onClick={() => handleSelect(availableLanguages[0])} // Vietnamese
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer flex items-center gap-1"
            >
              <span>🇻🇳 {t('langVietnamese', 'Tiếng Việt')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const en = availableLanguages.find((l) => l.code === 'en');
                if (en) handleSelect(en);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer flex items-center gap-1"
            >
              <span>🇺🇸 English</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
