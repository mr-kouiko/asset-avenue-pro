/**
 * Filter Tag Mapper
 * Maps UI filter selections to database tag arrays for server-side filtering.
 * Used by Marketplace.tsx to convert PhotoFilters/VideoFilters into RPC parameters.
 */

// ============================================================================
// PHOTO MAPPINGS
// ============================================================================

export const SUBJECT_TAGS: Record<string, string[]> = {
  "people-portraits": ["people", "person", "portrait", "face", "man", "woman", "businessman", "traditional clothing"],
  "business": ["business", "corporate", "office", "professional", "logistics", "supply chain", "industrial"],
  "nature-landscapes": ["nature", "landscape", "outdoor", "forest", "mountain", "desert", "wilderness"],
  "architecture": ["architecture", "building", "interior", "exterior", "modern architecture", "skyline", "skyscrapers", "cityscape", "landmark"],
  "food-drink": ["food", "drink", "restaurant", "cuisine"],
  "lifestyle": ["lifestyle", "home", "family", "culture"],
  "products": ["product", "ecommerce", "e-commerce"],
  "travel": ["travel", "vacation", "tourism", "destination", "exploration", "adventure", "voyage"],
  "technology": ["technology", "tech", "computer", "digital", "innovation", "infrastructure"],
  "abstract-textures": ["abstract", "pattern", "texture"],
};

export const STYLE_TAGS: Record<string, string[]> = {
  "professional": ["professional", "studio"],
  "candid": ["candid", "natural", "spontaneous"],
  "editorial": ["editorial", "magazine"],
  "minimalist": ["minimal", "minimalist", "clean"],
  "vintage": ["vintage", "retro", "classic"],
  "moody": ["moody", "dark", "atmospheric"],
  "bright-airy": ["bright", "colorful"],
  "cinematic": ["cinematic", "dramatic", "film"],
};

export const USE_CASE_TAGS: Record<string, string[]> = {
  "social-media": ["social", "instagram", "facebook", "tiktok", "reels"],
  "website-hero": ["hero", "banner", "header"],
  "marketing-ads": ["marketing", "advertisement", "commercial", "stock"],
  "blog-editorial": ["blog", "article", "editorial"],
  "presentation": ["presentation", "powerpoint"],
  "print": ["print", "packaging"],
  "ecommerce": ["ecommerce", "e-commerce", "product"],
};

export const ORIENTATION_TAGS: Record<string, string[]> = {
  "vertical": ["vertical", "9:16", "2:3", "3:4", "4:5"],
  "horizontal": ["horizontal", "16:9", "3:2", "4:3", "5:4", "21:9", "widescreen"],
  "square": ["square", "1:1"],
  "panoramic": ["panoramic", "wide", "aerial view"],
};

export const COLOR_TAGS: Record<string, string[]> = {
  "vibrant": ["vibrant", "saturated", "colorful"],
  "muted": ["muted", "pastel", "soft"],
  "monochrome": ["monochrome", "black and white", "bw"],
  "warm": ["warm", "orange", "sunset", "golden hour"],
  "cool": ["cool", "blue", "cold"],
};

export const AI_PHOTO_SUBJECT_TAGS: Record<string, string[]> = {
  "ai-portraits": ["portrait", "person", "face", "people"],
  "ai-landscapes": ["landscape", "nature", "scenery", "outdoor"],
  "ai-abstract": ["abstract", "texture", "pattern", "artistic"],
  "ai-product": ["product", "ecommerce", "commercial"],
  "ai-concept": ["concept art", "fantasy", "sci-fi", "futuristic"],
};

// ============================================================================
// VIDEO MAPPINGS
// ============================================================================

export const VIDEO_USE_CASE_TAGS: Record<string, string[]> = {
  "social-media": ["tiktok", "reels", "shorts", "social", "social media"],
  "ads-marketing": ["advertisement", "advertising", "commercial", "marketing"],
  "business-corporate": ["corporate", "business", "office", "professional"],
  "startup-saas": ["startup", "saas", "tech", "technology", "innovation"],
  "ecommerce-product": ["product", "ecommerce", "e-commerce"],
  "real-estate": ["real estate", "property", "architecture", "modern architecture"],
  "luxury-lifestyle": ["luxury", "lifestyle"],
  "motivation-success": ["motivation", "inspirational", "success"],
};

export const VIDEO_STYLE_TAGS: Record<string, string[]> = {
  "cinematic": ["cinematic", "film", "movie", "golden hour"],
  "minimal": ["minimal", "minimalist", "clean"],
  "futuristic": ["futuristic", "sci-fi", "future"],
  "abstract": ["abstract", "artistic"],
  "documentary": ["documentary", "reportage", "timelapse"],
  "urban-street": ["urban", "street", "city", "cityscape", "skyline", "metropolis", "downtown", "skyscrapers"],
  "nature-travel": ["nature", "travel", "tourism", "landscape", "outdoor", "wilderness", "desert", "adventure", "sunset"],
};

export const VIDEO_FORMAT_TAGS: Record<string, string[]> = {
  "vertical": ["vertical", "portrait video", "9:16"],
  "square": ["square", "1:1"],
  "horizontal": ["horizontal", "widescreen", "16:9"],
  "4k": ["4k", "uhd", "high resolution"],
  "loopable": ["loop", "loopable", "seamless"],
};

export const VIDEO_EFFECT_TAGS: Record<string, string[]> = {
  "backgrounds-loops": ["background", "background loop"],
  "transitions": ["transition"],
  "overlays": ["overlay"],
  "light-leaks": ["light leak", "lens flare"],
  "glitches": ["glitch", "distortion"],
  "particles": ["particles", "dust"],
  "countdowns": ["countdown", "timer"],
};

export const VIDEO_PLATFORM_TAGS: Record<string, string[]> = {
  "tiktok": ["tiktok"],
  "instagram": ["instagram", "reels"],
  "youtube": ["youtube", "shorts"],
  "ads": ["ads", "advertisement", "commercial"],
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Convert selected filter option values into a flat tag array.
 * Multiple selections within the same group are ORed (any tag match).
 */
export function resolveFilterTags(
  selected: string[],
  mapping: Record<string, string[]>
): string[] {
  const tags = new Set<string>();
  for (const value of selected) {
    const mapped = mapping[value];
    if (mapped) {
      for (const tag of mapped) tags.add(tag);
    }
  }
  return [...tags];
}
