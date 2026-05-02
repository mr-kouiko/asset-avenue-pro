import { useLanguage } from '@/contexts/LanguageContext';
import { localizePath, type Language } from '@/i18n';

/**
 * Hook returning a helper that prefixes paths with the current language
 * (English stays at root). Use for all internal navigation links.
 */
export const useLocalizedPath = () => {
  const { language } = useLanguage();
  return (path: string, langOverride?: Language) =>
    localizePath(path, langOverride ?? language);
};
