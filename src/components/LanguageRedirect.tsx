import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LanguageRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { pathname, search, hash } = location;

    // If user is on root path, no redirect needed - English is default
    if (pathname === '/') {
      return;
    }

    // Redirect old French routes to English
    if (pathname.startsWith('/fr/') || pathname === '/fr') {
      const newPath = pathname.replace('/fr', '') || '/';
      navigate(`${newPath}${search}${hash}`, { replace: true });
      return;
    }

    // Redirect old /en/ routes to root
    // IMPORTANT: preserve query params (e.g. ?theme=..., ?price=free)
    if (pathname.startsWith('/en/') || pathname === '/en') {
      const newPath = pathname.replace('/en', '') || '/';
      navigate(`${newPath}${search}${hash}`, { replace: true });
      return;
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
};