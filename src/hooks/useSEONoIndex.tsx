import { useEffect } from 'react';

/**
 * Hook to apply noindex,follow to pages that should not be indexed
 * Use for thin/empty pages, filter pages, search results, etc.
 */
export const useSEONoIndex = (shouldNoIndex: boolean, reason?: string) => {
  useEffect(() => {
    if (!shouldNoIndex) return;

    // Log reason for debugging
    if (reason) {
      console.log(`[SEO] Applying noindex: ${reason}`);
    }

    // Set robots meta tag
    const updateMetaTag = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
    };

    updateMetaTag('robots', 'noindex, follow');
    updateMetaTag('googlebot', 'noindex, follow');

    // Cleanup - restore default on unmount
    return () => {
      updateMetaTag('robots', 'index, follow');
      updateMetaTag('googlebot', 'index, follow');
    };
  }, [shouldNoIndex, reason]);
};

/**
 * Utility to check if a page should be noindexed based on content
 */
export const shouldNoIndexPage = (options: {
  hasResults?: boolean;
  resultCount?: number;
  minResultsForIndex?: number;
  hasFilters?: boolean;
  hasSearch?: boolean;
  isEmptyCategory?: boolean;
}): boolean => {
  const {
    hasResults = true,
    resultCount = 0,
    minResultsForIndex = 1,
    hasFilters = false,
    hasSearch = false,
    isEmptyCategory = false,
  } = options;

  // No results = soft 404
  if (!hasResults || resultCount < minResultsForIndex) {
    return true;
  }

  // Filter/search variations should not be indexed
  if (hasFilters || hasSearch) {
    return true;
  }

  // Empty categories
  if (isEmptyCategory) {
    return true;
  }

  return false;
};
