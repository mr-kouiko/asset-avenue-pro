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
  fr: {
    'search.placeholder': 'Rechercher des photos, vidéos, illustrations...',
    'nav.photos': 'Photos',
    'nav.videos': 'Vidéos',
    'nav.audio': 'Audio',
    'nav.illustrations': 'Illustrations',
    'nav.vectors': 'Vecteurs',
    'nav.trending': 'Tendances',
    'header.account': 'Mon Compte',
    'header.account.guest': 'Compte',
    'header.seller.dashboard': 'Dashboard vendeur',
    'header.upload': 'Uploader du contenu',
    'header.dashboard': 'Tableau de bord',
    'header.purchases': 'Mes achats',
    'header.login': 'Se connecter',
    'header.logout': 'Se déconnecter',
    'common.new': 'Nouveau',
    'audio.filters': 'Filtres Audio',
    'audio.sortBy': 'Trier par',
    'audio.popular': 'Populaire',
    'audio.relevant': 'Plus pertinent',
    'audio.fresh': 'Plus récent',
    'audio.random': 'Aléatoire',
    'audio.infinity': 'Visustock Infinity',
    'audio.all': 'Tous',
    'audio.includedInfinity': 'Inclus dans Infinity',
    'audio.moods': 'Ambiances',
    'audio.length': 'Durée',
    'audio.bpm': 'BPM',
    'audio.reset': 'Réinitialiser les filtres',
    'audio.mood.action': 'Action / Sports / Aventure',
    'audio.mood.corporate': 'Corporate / Promo / Pubs',
    'audio.mood.comedy': 'Comédie / Drôle',
    'audio.mood.drama': 'Drame / Suspense',
    'audio.mood.epic': 'Épique / Orchestral',
    'audio.mood.future': 'Futur / Technologie',
    'audio.mood.fashion': 'Mode / Style de vie',
    'audio.mood.games': 'Jeux / Enfants',
    'audio.mood.happy': 'Joyeux / Vacances',
    'audio.mood.horror': 'Horreur / Effrayant',
    'audio.mood.religious': 'Religieux',
    'audio.mood.inspiration': 'Inspiration / Magique',
    'audio.mood.romantic': 'Romantique / Sentimental',
    'audio.mood.solo': 'Solo / Relaxation',
    'audio.mood.sad': 'Triste / Sombre',
  },
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
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract language from URL path
  const getLanguageFromPath = (pathname: string): Language => {
    if (pathname.startsWith('/en/') || pathname === '/en') return 'en';
    if (pathname.startsWith('/fr/') || pathname === '/fr') return 'fr';
    return 'fr'; // default
  };

  const [language, setLanguageState] = useState<Language>(getLanguageFromPath(location.pathname));

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    
    // Update URL to reflect new language
    const currentPath = location.pathname;
    let newPath = '';
    
    // Remove existing language prefix
    if (currentPath.startsWith('/fr/') || currentPath.startsWith('/en/')) {
      newPath = currentPath.substring(3); // Remove /xx/
    } else if (currentPath === '/fr' || currentPath === '/en') {
      newPath = '';
    } else {
      newPath = currentPath;
    }
    
    // Add new language prefix
    const finalPath = `/${lang}${newPath || ''}`;
    navigate(finalPath, { replace: true });
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Update language when URL changes
  useEffect(() => {
    const newLang = getLanguageFromPath(location.pathname);
    if (newLang !== language) {
      setLanguageState(newLang);
    }
  }, [location.pathname, language]);

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