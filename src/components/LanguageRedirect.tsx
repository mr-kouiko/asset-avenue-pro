import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const LanguageRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // If user is on root path, redirect to French version
    if (path === '/') {
      navigate('/fr', { replace: true });
      return;
    }
    
    // If path doesn't start with language prefix, redirect to French version
    if (!path.startsWith('/fr/') && !path.startsWith('/en/') && path !== '/fr' && path !== '/en') {
      navigate(`/fr${path}`, { replace: true });
      return;
    }
  }, [location.pathname, navigate]);

  return null;
};