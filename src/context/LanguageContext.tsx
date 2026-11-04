import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LANGUAGES_196, Language } from '../data/languages';
import { getTranslation, TRANSLATIONS, TranslationDict } from '../data/translations';

export type { Language };

export interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  prefetchLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
  availableLanguages: Language[];
  recentLanguages: Language[];
  isTranslating: boolean;
  isRTL: boolean;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

const defaultLanguage: Language = LANGUAGES_196[0]; // Vietnamese

const RTL_CODES = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'yi', 'ckb', 'ug', 'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA']);

export const isRTLCode = (code: string): boolean => {
  return RTL_CODES.has(code) || code.startsWith('ar-');
};

// ============================================================================
// MODULE-LEVEL TWO-TIER IN-MEMORY CACHE (0ms Synchronous Access)
// ============================================================================
const IN_MEMORY_CACHE = new Map<string, Record<string, string>>();
const IN_FLIGHT_FETCHES = new Set<string>();

// Pre-seed in-memory cache with all built-in top languages
for (const [langCode, dict] of Object.entries(TRANSLATIONS)) {
  IN_MEMORY_CACHE.set(langCode, dict);
}

// Pre-read localStorage cache on browser init
if (typeof window !== 'undefined') {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('i18n_cache_')) {
        const langCode = key.replace('i18n_cache_', '');
        const val = localStorage.getItem(key);
        if (val && !IN_MEMORY_CACHE.has(langCode)) {
          IN_MEMORY_CACHE.set(langCode, JSON.parse(val));
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: defaultLanguage,
  setLanguage: () => {},
  prefetchLanguage: () => {},
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => {
    let text = fallback || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replaceAll(`{${k}}`, String(v));
      });
    }
    return text;
  },
  isLanguageModalOpen: false,
  openLanguageModal: () => {},
  closeLanguageModal: () => {},
  availableLanguages: LANGUAGES_196,
  recentLanguages: [defaultLanguage],
  isTranslating: false,
  isRTL: false,
  formatDate: (date: Date | string | number) => new Date(date).toLocaleDateString(),
  formatNumber: (num: number) => num.toLocaleString(),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Current Selected Language state
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('verity_selected_language');
      if (savedCode) {
        const found = LANGUAGES_196.find((l) => l.code === savedCode);
        if (found) return found;
      }
    }
    return defaultLanguage;
  });

  // 2. Recent Languages list (up to 6)
  const [recentLanguages, setRecentLanguages] = useState<Language[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('verity_recent_languages');
        if (raw) {
          const codes: string[] = JSON.parse(raw);
          const list = codes
            .map((c) => LANGUAGES_196.find((l) => l.code === c))
            .filter(Boolean) as Language[];
          if (list.length > 0) return list;
        }
      } catch {
        // ignore
      }
    }
    return [LANGUAGES_196[0], LANGUAGES_196[1]]; // Vietnamese & English
  });

  // 3. Dynamic Dictionary Cache React state
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, Record<string, string>>>(() => {
    const initialMap: Record<string, Record<string, string>> = {};
    for (const [code, dict] of IN_MEMORY_CACHE.entries()) {
      initialMap[code] = dict;
    }
    return initialMap;
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Is RTL calculation
  const isRTL = useMemo(() => isRTLCode(currentLanguage.code), [currentLanguage.code]);

  // Sync HTML lang and dir attributes in real time
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage.code;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [currentLanguage.code, isRTL]);

  // High-speed async prefetcher with in-memory & localStorage deduplication
  const prefetchLanguage = useCallback((lang: Language) => {
    const code = lang.code;

    // 0ms: Already in static or in-memory cache
    if (TRANSLATIONS[code] || IN_MEMORY_CACHE.has(code)) {
      return;
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`i18n_cache_${code}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Object.keys(parsed).length > 0) {
            IN_MEMORY_CACHE.set(code, parsed);
            setDynamicTranslations((prev) => ({ ...prev, [code]: parsed }));
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    // Check in-flight deduplication
    if (IN_FLIGHT_FETCHES.has(code)) {
      return;
    }

    IN_FLIGHT_FETCHES.add(code);
    const sourceDict = TRANSLATIONS['en'] || TRANSLATIONS['vi'];

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: sourceDict,
        targetLang: lang.englishName || lang.name,
        targetLangCode: code,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.translations && Object.keys(data.translations).length > 0) {
          IN_MEMORY_CACHE.set(code, data.translations);
          setDynamicTranslations((prev) => ({ ...prev, [code]: data.translations }));
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`i18n_cache_${code}`, JSON.stringify(data.translations));
            } catch {
              // ignore
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Prefetch translation notice for', code, err);
      })
      .finally(() => {
        IN_FLIGHT_FETCHES.delete(code);
      });
  }, []);

  // Hybrid Instant Dictionary + AI Batch Translation with Persistent Cache
  useEffect(() => {
    const langCode = currentLanguage.code;

    // A. Built-in precompiled dictionary check (0ms)
    if (TRANSLATIONS[langCode] || IN_MEMORY_CACHE.has(langCode)) {
      setIsTranslating(false);
      return;
    }

    // B. Check local state
    if (dynamicTranslations[langCode] && Object.keys(dynamicTranslations[langCode]).length > 0) {
      setIsTranslating(false);
      return;
    }

    // C. Check localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const localCached = localStorage.getItem(`i18n_cache_${langCode}`);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          if (parsed && Object.keys(parsed).length > 0) {
            IN_MEMORY_CACHE.set(langCode, parsed);
            setDynamicTranslations((prev) => ({ ...prev, [langCode]: parsed }));
            setIsTranslating(false);
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    // D. Fetch structured batch translation from Gemini AI
    setIsTranslating(true);
    const sourceDict = TRANSLATIONS['en'] || TRANSLATIONS['vi'];

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: sourceDict,
        targetLang: currentLanguage.englishName || currentLanguage.name,
        targetLangCode: currentLanguage.code,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.translations && Object.keys(data.translations).length > 0) {
          IN_MEMORY_CACHE.set(langCode, data.translations);
          setDynamicTranslations((prev) => ({ ...prev, [langCode]: data.translations }));
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`i18n_cache_${langCode}`, JSON.stringify(data.translations));
            } catch {
              // ignore
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Batch translation notice for', langCode, err);
      })
      .finally(() => {
        setIsTranslating(false);
      });
  }, [currentLanguage]);

  // Instant reactive switch language handler (0ms synchronous read from in-memory cache)
  const handleSetLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('verity_selected_language', lang.code);

      // Check if cache already exists in memory or localStorage and load synchronously
      const inMem = IN_MEMORY_CACHE.get(lang.code);
      if (inMem) {
        setDynamicTranslations((prev) => ({ ...prev, [lang.code]: inMem }));
      } else {
        try {
          const cached = localStorage.getItem(`i18n_cache_${lang.code}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            IN_MEMORY_CACHE.set(lang.code, parsed);
            setDynamicTranslations((prev) => ({ ...prev, [lang.code]: parsed }));
          }
        } catch {
          // ignore
        }
      }

      // Update recent languages
      setRecentLanguages((prev) => {
        const filtered = prev.filter((l) => l.code !== lang.code);
        const updated = [lang, ...filtered].slice(0, 6);
        try {
          localStorage.setItem('verity_recent_languages', JSON.stringify(updated.map((l) => l.code)));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, []);

  // Universal translation lookup with parameter interpolation & 0ms synchronous in-memory read
  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      const langCode = currentLanguage.code;
      let text = '';

      // 1. Module-level in-memory cache (0ms synchronous)
      const memDict = IN_MEMORY_CACHE.get(langCode);
      if (memDict && memDict[key]) {
        text = memDict[key];
      } else if (dynamicTranslations[langCode]?.[key]) {
        // 2. React dynamic translations
        text = dynamicTranslations[langCode][key];
      } else if (TRANSLATIONS[langCode]?.[key]) {
        // 3. Exact match in pre-compiled TRANSLATIONS dictionary
        text = TRANSLATIONS[langCode][key];
      } else {
        // 4. Clean fallback logic
        if (langCode === 'vi') {
          text = TRANSLATIONS['vi']?.[key] || fallback || key;
        } else {
          // For any non-Vietnamese language, prioritize English baseline before Vietnamese
          text = TRANSLATIONS['en']?.[key] || TRANSLATIONS['vi']?.[key] || fallback || key;
        }
      }

      // Parameter interpolation {param}
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replaceAll(`{${k}}`, String(v));
        });
      }

      return text;
    },
    [currentLanguage.code, dynamicTranslations]
  );

  // Internationalized Date Formatter
  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        return new Intl.DateTimeFormat(currentLanguage.code, options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(d);
      } catch {
        return new Date(date).toLocaleDateString();
      }
    },
    [currentLanguage.code]
  );

  // Internationalized Number Formatter
  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(currentLanguage.code, options).format(num);
      } catch {
        return num.toLocaleString();
      }
    },
    [currentLanguage.code]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage: handleSetLanguage,
        prefetchLanguage,
        t,
        isLanguageModalOpen,
        openLanguageModal: () => setIsLanguageModalOpen(true),
        closeLanguageModal: () => setIsLanguageModalOpen(false),
        availableLanguages: LANGUAGES_196,
        recentLanguages,
        isTranslating,
        isRTL,
        formatDate,
        formatNumber,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
