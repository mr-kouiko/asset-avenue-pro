import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LanguageRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // If user is on root path, no redirect needed - English is default
    if (path === '/') {
      return;
    }
    
    // Redirect old French routes to English
    if (path.startsWith('/fr/') || path === '/fr') {
      const newPath = path.replace('/fr', '');
      navigate(newPath || '/', { replace: true });
      return;
    }
    
    // Redirect old /en/ routes to root
    if (path.startsWith('/en/') || path === '/en') {
      const newPath = path.replace('/en', '');
      navigate(newPath || '/', { replace: true });
      return;
    }
  }, [location.pathname, navigate]);

  return null;
};