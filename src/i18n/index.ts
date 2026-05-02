import { en } from './en';
import { fr } from './fr';
import { es } from './es';
import { de } from './de';
import { pt } from './pt';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'pt';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'es', 'de', 'pt'];
export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_LABELS: Record<Language, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  pt: { name: 'Português', flag: '🇵🇹' },
};

export const translations: Record<Language, Record<string, string>> = {
  en, fr, es, de, pt,
};

export function isLanguage(value: string | undefined): value is Language {
  return !!value && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

/**
 * Strip a language prefix from the pathname if present.
 * "/fr/marketplace" → { lang: 'fr', rest: '/marketplace' }
 * "/marketplace"    → { lang: null, rest: '/marketplace' }
 */
export function parseLangFromPath(pathname: string): { lang: Language | null; rest: string } {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  if (match && isLanguage(match[1])) {
    const rest = pathname.slice(3) || '/';
    return { lang: match[1] as Language, rest };
  }
  return { lang: null, rest: pathname };
}

/** Build a localized URL. English stays at root; other languages get prefix. */
export function localizePath(path: string, lang: Language): string {
  const { rest } = parseLangFromPath(path);
  if (lang === DEFAULT_LANGUAGE) return rest;
  if (rest === '/') return `/${lang}`;
  return `/${lang}${rest}`;
}
