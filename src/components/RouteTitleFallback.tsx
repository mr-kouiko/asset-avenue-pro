import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_TITLE = "VisuStock - Creative Content Marketplace";

/**
 * Ensures the tab title never gets stuck with a stale value (e.g. after visiting a 404).
 * Pages that set their own SEO/title will override this value after mount.
 */
export const RouteTitleFallback = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = DEFAULT_TITLE;
  }, [location.pathname]);

  return null;
};
