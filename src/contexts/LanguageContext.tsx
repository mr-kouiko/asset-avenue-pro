import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    'search.placeholder': 'Search for photos, videos, illustrations...',
    'nav.photos': 'Photos',
    'nav.videos': 'Videos',
    'nav.audio': 'Audio',
    'nav.illustrations': 'Illustrations',
    'nav.vectors': 'Vectors',
    'nav.trending': 'Trending',
    'header.account': 'My Account',
    'header.account.guest': 'Account',
    'header.seller.dashboard': 'Seller Dashboard',
    'header.upload': 'Upload Content',
    'header.dashboard': 'Dashboard',
    'header.purchases': 'My Purchases',
    'header.login': 'Sign In',
    'header.logout': 'Sign Out',
    'common.new': 'New',
    'audio.filters': 'Audio Filters',
    'audio.sortBy': 'Sort by',
    'audio.popular': 'Popular',
    'audio.relevant': 'Most relevant',
    'audio.fresh': 'Most fresh',
    'audio.random': 'Random',
    'audio.infinity': 'Visustock Infinity',
    'audio.all': 'All',
    'audio.includedInfinity': 'Included in Infinity',
    'audio.moods': 'Moods',
    'audio.length': 'Length',
    'audio.bpm': 'BPM',
    'audio.reset': 'Reset filters',
    'audio.mood.action': 'Action / Sports / Adventure',
    'audio.mood.corporate': 'Corporate / Promo / Ads',
    'audio.mood.comedy': 'Comedy / Funny',
    'audio.mood.drama': 'Drama / Suspense',
    'audio.mood.epic': 'Epic / Orchestral',
    'audio.mood.future': 'Future / Technology',
    'audio.mood.fashion': 'Fashion / Lifestyle',
    'audio.mood.games': 'Games / Kids',
    'audio.mood.happy': 'Happy / Holiday',
    'audio.mood.horror': 'Horror / Scary',
    'audio.mood.religious': 'Religious',
    'audio.mood.inspiration': 'Inspiration / Magical',
    'audio.mood.romantic': 'Romantic / Sentimental',
    'audio.mood.solo': 'Solo / Relaxation',
    'audio.mood.sad': 'Sad / Dark',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Site is now 100% English - always use 'en'
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    // Site is English only - language switching disabled
    setLanguageState('en');
  };

  const t = (key: string): string => {
    return translations['en'][key] || key;
  };

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