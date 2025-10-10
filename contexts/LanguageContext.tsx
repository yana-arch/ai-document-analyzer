import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import translations from '../translations';

type Locale = 'en' | 'vi';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getNestedTranslation = (obj: any, path: string): string => {
  return path.split('.').reduce((o, i) => (o ? o[i] : path), obj);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const savedLocale = localStorage.getItem('locale');
      return (savedLocale === 'vi' || savedLocale === 'en') ? savedLocale : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('locale', locale);
    } catch (e) {
      console.error("Failed to save locale to localStorage", e);
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string): string => {
    const translation = getNestedTranslation(translations[locale], key);
    if (!translation || translation === key) {
        // Fallback to English if translation is missing
        return getNestedTranslation(translations['en'], key) || key;
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
