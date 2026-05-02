import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Legacy redirect handler — currently a no-op.
 * Language detection is fully handled by LanguageProvider via URL prefix
 * and route definitions in App.tsx.
 */
export const LanguageRedirect = () => {
  const location = useLocation();
  useEffect(() => {
    // Reserved for future legacy URL migrations.
  }, [location.pathname]);
  return null;
};
