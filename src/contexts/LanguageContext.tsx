import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  translations,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isLanguage,
  parseLangFromPath,
  localizePath,
  type Language,
} from '@/i18n';

export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'visustock_language';

function detectInitialLanguage(pathname: string): Language {
  const fromUrl = parseLangFromPath(pathname).lang;
  if (fromUrl) return fromUrl;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
    const browser = navigator.language?.slice(0, 2).toLowerCase();
    if (isLanguage(browser)) return browser;
  }
  return DEFAULT_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguageState] = useState<Language>(() =>
    detectInitialLanguage(typeof window !== 'undefined' ? window.location.pathname : '/')
  );

  // Keep language synced with URL prefix on navigation
  useEffect(() => {
    const fromUrl = parseLangFromPath(location.pathname).lang;
    if (fromUrl && fromUrl !== language) {
      setLanguageState(fromUrl);
      localStorage.setItem(STORAGE_KEY, fromUrl);
    }
  }, [location.pathname, language]);

  // Update <html lang>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    const newPath = localizePath(location.pathname, lang);
    navigate(`${newPath}${location.search}${location.hash}`, { replace: false });
  }, [navigate, location.pathname, location.search, location.hash]);

  const t = useCallback(
    (key: string): string =>
      translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
