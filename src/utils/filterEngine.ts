/**
 * Structured Filtering Engine
 * 
 * Hard filters (category, use case, AI type, content type) use EXACT MATCHING
 * Keywords are used ONLY for ranking within the valid result set
 * 
 * Filtering Hierarchy:
 * 1. Hard Filters (AND logic) - Must match ALL selected criteria
 * 2. Soft Signals (ranking) - Keywords only affect sort order
 * 
 * If no assets match, return empty state - never guess
 */

import type { VideoFilters } from "@/components/VideoFiltersPanel";
import type { PhotoFilters } from "@/components/PhotoFiltersPanel";
import type { MarketplaceContent } from "@/hooks/useMarketplace";

// ============================================================================
// NORMALIZED TAXONOMY
// ============================================================================

export const VIDEO_TAXONOMY = {
  useCase: [
    "social-media",
    "ads-marketing", 
    "business-corporate",
    "startup-saas",
    "ecommerce-product",
    "real-estate",
    "luxury-lifestyle",
    "motivation-success"
  ],
  aiVideos: [
    "ai-generated",
    "ai-cinematic",
    "ai-avatars",
    "ai-backgrounds",
    "ai-motion-graphics"
  ],
  style: [
    "cinematic",
    "minimal",
    "futuristic",
    "abstract",
    "documentary",
    "urban-street",
    "nature-travel"
  ],
  format: [
    "vertical",
    "square",
    "horizontal",
    "4k",
    "loopable"
  ],
  effects: [
    "backgrounds-loops",
    "transitions",
    "overlays",
    "light-leaks",
    "glitches",
    "particles",
    "countdowns"
  ],
  platform: [
    "tiktok",
    "instagram",
    "youtube",
    "ads"
  ]
} as const;

export const PHOTO_TAXONOMY = {
  useCase: [
    "social-media",
    "website-hero",
    "marketing-ads",
    "blog-editorial",
    "presentation",
    "print",
    "ecommerce"
  ],
  aiPhotos: [
    "ai-generated",
    "ai-portraits",
    "ai-landscapes",
    "ai-abstract",
    "ai-product",
    "ai-concept"
  ],
  subject: [
    "people",
    "business",
    "nature",
    "technology",
    "food-drink",
    "travel",
    "architecture",
    "abstract",
    "lifestyle",
    "sports",
    "health",
    "education"
  ],
  style: [
    "professional",
    "candid",
    "editorial",
    "artistic",
    "vintage",
    "minimalist",
    "dramatic",
    "bright",
    "moody"
  ],
  format: [
    "horizontal",
    "vertical",
    "square",
    "panoramic"
  ],
  color: [
    "warm",
    "cool",
    "neutral",
    "vibrant",
    "pastel",
    "monochrome"
  ]
} as const;

// ============================================================================
// TAG TO TAXONOMY MAPPING (Video)
// ============================================================================

type VideoTaxonomyKey = keyof typeof VIDEO_TAXONOMY;
type PhotoTaxonomyKey = keyof typeof PHOTO_TAXONOMY;

const TAG_TO_VIDEO_TAXONOMY: Record<string, { category: VideoTaxonomyKey; value: string }[]> = {
  // Use Case mappings
  "tiktok": [{ category: "useCase", value: "social-media" }, { category: "platform", value: "tiktok" }],
  "reels": [{ category: "useCase", value: "social-media" }, { category: "platform", value: "instagram" }],
  "shorts": [{ category: "useCase", value: "social-media" }, { category: "platform", value: "youtube" }],
  "social": [{ category: "useCase", value: "social-media" }],
  "social media": [{ category: "useCase", value: "social-media" }],
  "advertisement": [{ category: "useCase", value: "ads-marketing" }],
  "advertising": [{ category: "useCase", value: "ads-marketing" }],
  "commercial": [{ category: "useCase", value: "ads-marketing" }],
  "marketing": [{ category: "useCase", value: "ads-marketing" }],
  "corporate": [{ category: "useCase", value: "business-corporate" }],
  "business": [{ category: "useCase", value: "business-corporate" }],
  "office": [{ category: "useCase", value: "business-corporate" }],
  "startup": [{ category: "useCase", value: "startup-saas" }],
  "saas": [{ category: "useCase", value: "startup-saas" }],
  "tech": [{ category: "useCase", value: "startup-saas" }],
  "product": [{ category: "useCase", value: "ecommerce-product" }],
  "ecommerce": [{ category: "useCase", value: "ecommerce-product" }],
  "real estate": [{ category: "useCase", value: "real-estate" }],
  "property": [{ category: "useCase", value: "real-estate" }],
  "luxury": [{ category: "useCase", value: "luxury-lifestyle" }],
  "lifestyle": [{ category: "useCase", value: "luxury-lifestyle" }],
  "motivation": [{ category: "useCase", value: "motivation-success" }],
  "inspirational": [{ category: "useCase", value: "motivation-success" }],
  "success": [{ category: "useCase", value: "motivation-success" }],
  
  // AI Video mappings
  "ai": [{ category: "aiVideos", value: "ai-generated" }],
  "ai generated": [{ category: "aiVideos", value: "ai-generated" }],
  "ai-generated": [{ category: "aiVideos", value: "ai-generated" }],
  "generated": [{ category: "aiVideos", value: "ai-generated" }],
  "sora": [{ category: "aiVideos", value: "ai-generated" }],
  "runway": [{ category: "aiVideos", value: "ai-generated" }],
  "pika": [{ category: "aiVideos", value: "ai-generated" }],
  "b-roll": [{ category: "aiVideos", value: "ai-cinematic" }],
  "broll": [{ category: "aiVideos", value: "ai-cinematic" }],
  "cinematic ai": [{ category: "aiVideos", value: "ai-cinematic" }],
  "avatar": [{ category: "aiVideos", value: "ai-avatars" }],
  "digital avatar": [{ category: "aiVideos", value: "ai-avatars" }],
  "virtual avatar": [{ category: "aiVideos", value: "ai-avatars" }],
  "background loop": [{ category: "aiVideos", value: "ai-backgrounds" }],
  "motion graphics": [{ category: "aiVideos", value: "ai-motion-graphics" }],
  "mograph": [{ category: "aiVideos", value: "ai-motion-graphics" }],
  
  // Style mappings
  "cinematic": [{ category: "style", value: "cinematic" }],
  "film": [{ category: "style", value: "cinematic" }],
  "movie": [{ category: "style", value: "cinematic" }],
  "minimal": [{ category: "style", value: "minimal" }],
  "minimalist": [{ category: "style", value: "minimal" }],
  "clean": [{ category: "style", value: "minimal" }],
  "futuristic": [{ category: "style", value: "futuristic" }],
  "sci-fi": [{ category: "style", value: "futuristic" }],
  "future": [{ category: "style", value: "futuristic" }],
  "abstract": [{ category: "style", value: "abstract" }],
  "artistic": [{ category: "style", value: "abstract" }],
  "documentary": [{ category: "style", value: "documentary" }],
  "reportage": [{ category: "style", value: "documentary" }],
  "urban": [{ category: "style", value: "urban-street" }],
  "street": [{ category: "style", value: "urban-street" }],
  "city": [{ category: "style", value: "urban-street" }],
  "nature": [{ category: "style", value: "nature-travel" }],
  "travel": [{ category: "style", value: "nature-travel" }],
  "landscape video": [{ category: "style", value: "nature-travel" }],
  "outdoor": [{ category: "style", value: "nature-travel" }],
  
  // Format mappings
  "vertical": [{ category: "format", value: "vertical" }],
  "portrait video": [{ category: "format", value: "vertical" }],
  "9:16": [{ category: "format", value: "vertical" }],
  "square": [{ category: "format", value: "square" }],
  "1:1": [{ category: "format", value: "square" }],
  "horizontal": [{ category: "format", value: "horizontal" }],
  "widescreen": [{ category: "format", value: "horizontal" }],
  "16:9": [{ category: "format", value: "horizontal" }],
  "4k": [{ category: "format", value: "4k" }],
  "uhd": [{ category: "format", value: "4k" }],
  "loop": [{ category: "format", value: "loopable" }],
  "loopable": [{ category: "format", value: "loopable" }],
  "seamless": [{ category: "format", value: "loopable" }],
  
  // Effects mappings
  "background": [{ category: "effects", value: "backgrounds-loops" }],
  "transition": [{ category: "effects", value: "transitions" }],
  "overlay": [{ category: "effects", value: "overlays" }],
  "light leak": [{ category: "effects", value: "light-leaks" }],
  "lens flare": [{ category: "effects", value: "light-leaks" }],
  "glitch": [{ category: "effects", value: "glitches" }],
  "distortion": [{ category: "effects", value: "glitches" }],
  "particles": [{ category: "effects", value: "particles" }],
  "dust": [{ category: "effects", value: "particles" }],
  "countdown": [{ category: "effects", value: "countdowns" }],
  "timer": [{ category: "effects", value: "countdowns" }],
};

// ============================================================================
// TAG TO TAXONOMY MAPPING (Photo) - No duplicate keys
// ============================================================================

const TAG_TO_PHOTO_TAXONOMY: Record<string, { category: PhotoTaxonomyKey; value: string }[]> = {
  // Use Case mappings
  "social": [{ category: "useCase", value: "social-media" }],
  "instagram": [{ category: "useCase", value: "social-media" }],
  "facebook": [{ category: "useCase", value: "social-media" }],
  "hero": [{ category: "useCase", value: "website-hero" }],
  "banner": [{ category: "useCase", value: "website-hero" }],
  "header": [{ category: "useCase", value: "website-hero" }],
  "marketing": [{ category: "useCase", value: "marketing-ads" }],
  "advertisement": [{ category: "useCase", value: "marketing-ads" }],
  "blog": [{ category: "useCase", value: "blog-editorial" }],
  "article": [{ category: "useCase", value: "blog-editorial" }],
  "presentation": [{ category: "useCase", value: "presentation" }],
  "powerpoint": [{ category: "useCase", value: "presentation" }],
  "print": [{ category: "useCase", value: "print" }],
  "packaging": [{ category: "useCase", value: "print" }],
  "ecommerce": [{ category: "useCase", value: "ecommerce" }],
  "product": [{ category: "useCase", value: "ecommerce" }],
  
  // AI Photo mappings
  "ai": [{ category: "aiPhotos", value: "ai-generated" }],
  "ai generated": [{ category: "aiPhotos", value: "ai-generated" }],
  "ai-generated": [{ category: "aiPhotos", value: "ai-generated" }],
  "midjourney": [{ category: "aiPhotos", value: "ai-generated" }],
  "dall-e": [{ category: "aiPhotos", value: "ai-generated" }],
  "stable diffusion": [{ category: "aiPhotos", value: "ai-generated" }],
  "ai portrait": [{ category: "aiPhotos", value: "ai-portraits" }],
  "ai landscape": [{ category: "aiPhotos", value: "ai-landscapes" }],
  "ai abstract": [{ category: "aiPhotos", value: "ai-abstract" }],
  "ai product": [{ category: "aiPhotos", value: "ai-product" }],
  "concept art": [{ category: "aiPhotos", value: "ai-concept" }],
  
  // Subject mappings
  "people": [{ category: "subject", value: "people" }],
  "person": [{ category: "subject", value: "people" }],
  "portrait": [{ category: "subject", value: "people" }, { category: "format", value: "vertical" }],
  "face": [{ category: "subject", value: "people" }],
  "business": [{ category: "subject", value: "business" }],
  "corporate": [{ category: "subject", value: "business" }],
  "office": [{ category: "subject", value: "business" }],
  "nature": [{ category: "subject", value: "nature" }],
  "landscape": [{ category: "subject", value: "nature" }, { category: "format", value: "horizontal" }],
  "outdoor": [{ category: "subject", value: "nature" }],
  "forest": [{ category: "subject", value: "nature" }],
  "mountain": [{ category: "subject", value: "nature" }],
  "technology": [{ category: "subject", value: "technology" }],
  "tech": [{ category: "subject", value: "technology" }],
  "computer": [{ category: "subject", value: "technology" }],
  "digital": [{ category: "subject", value: "technology" }],
  "food": [{ category: "subject", value: "food-drink" }],
  "drink": [{ category: "subject", value: "food-drink" }],
  "restaurant": [{ category: "subject", value: "food-drink" }],
  "cuisine": [{ category: "subject", value: "food-drink" }],
  "travel": [{ category: "subject", value: "travel" }],
  "vacation": [{ category: "subject", value: "travel" }],
  "tourism": [{ category: "subject", value: "travel" }],
  "destination": [{ category: "subject", value: "travel" }],
  "architecture": [{ category: "subject", value: "architecture" }],
  "building": [{ category: "subject", value: "architecture" }],
  "interior": [{ category: "subject", value: "architecture" }],
  "exterior": [{ category: "subject", value: "architecture" }],
  "abstract": [{ category: "subject", value: "abstract" }],
  "pattern": [{ category: "subject", value: "abstract" }],
  "texture": [{ category: "subject", value: "abstract" }],
  "lifestyle": [{ category: "subject", value: "lifestyle" }],
  "home": [{ category: "subject", value: "lifestyle" }],
  "family": [{ category: "subject", value: "lifestyle" }],
  "sports": [{ category: "subject", value: "sports" }],
  "fitness": [{ category: "subject", value: "sports" }],
  "exercise": [{ category: "subject", value: "sports" }],
  "health": [{ category: "subject", value: "health" }],
  "wellness": [{ category: "subject", value: "health" }],
  "medical": [{ category: "subject", value: "health" }],
  "education": [{ category: "subject", value: "education" }],
  "school": [{ category: "subject", value: "education" }],
  "learning": [{ category: "subject", value: "education" }],
  
  // Style mappings
  "professional": [{ category: "style", value: "professional" }],
  "studio": [{ category: "style", value: "professional" }],
  "candid": [{ category: "style", value: "candid" }],
  "natural": [{ category: "style", value: "candid" }],
  "spontaneous": [{ category: "style", value: "candid" }],
  "editorial": [{ category: "style", value: "editorial" }],
  "magazine": [{ category: "style", value: "editorial" }],
  "artistic": [{ category: "style", value: "artistic" }],
  "creative": [{ category: "style", value: "artistic" }],
  "vintage": [{ category: "style", value: "vintage" }],
  "retro": [{ category: "style", value: "vintage" }],
  "classic": [{ category: "style", value: "vintage" }],
  "minimal": [{ category: "style", value: "minimalist" }],
  "minimalist": [{ category: "style", value: "minimalist" }],
  "clean": [{ category: "style", value: "minimalist" }],
  "dramatic": [{ category: "style", value: "dramatic" }],
  "cinematic": [{ category: "style", value: "dramatic" }],
  "bright": [{ category: "style", value: "bright" }],
  "colorful": [{ category: "style", value: "bright" }],
  "moody": [{ category: "style", value: "moody" }],
  "dark": [{ category: "style", value: "moody" }],
  "atmospheric": [{ category: "style", value: "moody" }],
  
  // Format mappings (without duplicates from subject)
  "horizontal": [{ category: "format", value: "horizontal" }],
  "widescreen": [{ category: "format", value: "horizontal" }],
  "16:9": [{ category: "format", value: "horizontal" }],
  "vertical": [{ category: "format", value: "vertical" }],
  "9:16": [{ category: "format", value: "vertical" }],
  "square": [{ category: "format", value: "square" }],
  "1:1": [{ category: "format", value: "square" }],
  "panoramic": [{ category: "format", value: "panoramic" }],
  "wide": [{ category: "format", value: "panoramic" }],
  
  // Color mappings (without duplicates)
  "warm": [{ category: "color", value: "warm" }],
  "orange": [{ category: "color", value: "warm" }],
  "sunset": [{ category: "color", value: "warm" }],
  "cool": [{ category: "color", value: "cool" }],
  "blue": [{ category: "color", value: "cool" }],
  "cold": [{ category: "color", value: "cool" }],
  "neutral": [{ category: "color", value: "neutral" }],
  "muted": [{ category: "color", value: "neutral" }],
  "vibrant": [{ category: "color", value: "vibrant" }, { category: "style", value: "bright" }],
  "saturated": [{ category: "color", value: "vibrant" }],
  "pastel": [{ category: "color", value: "pastel" }],
  "soft": [{ category: "color", value: "pastel" }],
  "monochrome": [{ category: "color", value: "monochrome" }],
  "black and white": [{ category: "color", value: "monochrome" }],
  "bw": [{ category: "color", value: "monochrome" }],
};

// ============================================================================
// TAXONOMY RESOLUTION
// ============================================================================

function extractVideoTaxonomy(content: MarketplaceContent): {
  useCase: string[];
  aiVideos: string[];
  style: string[];
  format: string[];
  effects: string[];
  platform: string[];
  isAiGenerated: boolean;
  isLoopable: boolean;
  hasPeople: boolean;
  hasCopySpace: boolean;
  orientation: string | null;
  resolution: string | null;
} {
  const result = {
    useCase: [] as string[],
    aiVideos: [] as string[],
    style: [] as string[],
    format: [] as string[],
    effects: [] as string[],
    platform: [] as string[],
    isAiGenerated: content.isAiGenerated || false,
    isLoopable: false,
    hasPeople: false,
    hasCopySpace: false,
    orientation: null as string | null,
    resolution: null as string | null,
  };
  
  const tags = (content.tags || []).map(t => t.toLowerCase().trim());
  const title = content.title?.toLowerCase() || '';
  
  for (const tag of tags) {
    const mappings = TAG_TO_VIDEO_TAXONOMY[tag];
    if (mappings) {
      for (const mapping of mappings) {
        const arr = result[mapping.category] as string[];
        if (!arr.includes(mapping.value)) {
          arr.push(mapping.value);
        }
        if (mapping.category === "aiVideos") {
          result.isAiGenerated = true;
        }
        if (mapping.value === "loopable") {
          result.isLoopable = true;
        }
      }
    }
    
    if (["people", "person", "human", "man", "woman", "crowd", "team", "group"].includes(tag)) {
      result.hasPeople = true;
    }
    
    if (["copy space", "copyspace", "text space", "negative space"].includes(tag)) {
      result.hasCopySpace = true;
    }
    
    if (["vertical", "portrait", "9:16"].includes(tag)) {
      result.orientation = "vertical";
    } else if (["horizontal", "landscape", "16:9"].includes(tag)) {
      result.orientation = "horizontal";
    } else if (["square", "1:1"].includes(tag)) {
      result.orientation = "square";
    }
    
    if (["4k", "uhd", "ultra hd"].includes(tag)) {
      result.resolution = "4k";
    } else if (["hd", "1080p", "full hd"].includes(tag)) {
      result.resolution = "hd";
    }
  }
  
  for (const [keyword, mappings] of Object.entries(TAG_TO_VIDEO_TAXONOMY)) {
    if (title.includes(keyword)) {
      for (const mapping of mappings) {
        const arr = result[mapping.category] as string[];
        if (!arr.includes(mapping.value)) {
          arr.push(mapping.value);
        }
      }
    }
  }
  
  return result;
}

function extractPhotoTaxonomy(content: MarketplaceContent): {
  useCase: string[];
  aiPhotos: string[];
  subject: string[];
  style: string[];
  format: string[];
  color: string[];
  isAiGenerated: boolean;
  hasPeople: boolean;
  numberOfPeople: string | null;
  hasCopySpace: boolean;
  orientation: string | null;
  resolution: string | null;
} {
  const result = {
    useCase: [] as string[],
    aiPhotos: [] as string[],
    subject: [] as string[],
    style: [] as string[],
    format: [] as string[],
    color: [] as string[],
    isAiGenerated: content.isAiGenerated || false,
    hasPeople: false,
    numberOfPeople: null as string | null,
    hasCopySpace: false,
    orientation: null as string | null,
    resolution: null as string | null,
  };
  
  const tags = (content.tags || []).map(t => t.toLowerCase().trim());
  const title = content.title?.toLowerCase() || '';
  
  for (const tag of tags) {
    const mappings = TAG_TO_PHOTO_TAXONOMY[tag];
    if (mappings) {
      for (const mapping of mappings) {
        const arr = result[mapping.category] as string[];
        if (!arr.includes(mapping.value)) {
          arr.push(mapping.value);
        }
        if (mapping.category === "aiPhotos") {
          result.isAiGenerated = true;
        }
      }
    }
    
    if (["people", "person", "human", "man", "woman", "crowd", "team", "group", "portrait", "face"].includes(tag)) {
      result.hasPeople = true;
    }
    
    if (["solo", "one person", "single", "individual"].includes(tag)) {
      result.numberOfPeople = "one";
    } else if (["couple", "two people", "pair", "duo"].includes(tag)) {
      result.numberOfPeople = "two";
    } else if (["group", "team", "crowd", "many people"].includes(tag)) {
      result.numberOfPeople = "group";
    }
    
    if (["copy space", "copyspace", "text space", "negative space"].includes(tag)) {
      result.hasCopySpace = true;
    }
    
    if (["vertical", "portrait", "9:16"].includes(tag)) {
      result.orientation = "vertical";
    } else if (["horizontal", "landscape", "16:9"].includes(tag)) {
      result.orientation = "horizontal";
    } else if (["square", "1:1"].includes(tag)) {
      result.orientation = "square";
    }
    
    if (["4k", "high resolution", "hi-res"].includes(tag)) {
      result.resolution = "4k";
    } else if (["hd", "1080p"].includes(tag)) {
      result.resolution = "hd";
    }
  }
  
  for (const [keyword, mappings] of Object.entries(TAG_TO_PHOTO_TAXONOMY)) {
    if (title.includes(keyword)) {
      for (const mapping of mappings) {
        const arr = result[mapping.category] as string[];
        if (!arr.includes(mapping.value)) {
          arr.push(mapping.value);
        }
      }
    }
  }
  
  return result;
}

// ============================================================================
// HARD FILTER APPLICATION
// ============================================================================

export function applyVideoHardFilters(
  content: MarketplaceContent[],
  filters: VideoFilters
): MarketplaceContent[] {
  const hasActiveFilters = 
    filters.useCase.length > 0 ||
    filters.aiVideos.length > 0 ||
    filters.style.length > 0 ||
    filters.format.length > 0 ||
    filters.effects.length > 0 ||
    filters.orientation !== null ||
    filters.resolution !== null ||
    filters.aiGenerated !== null ||
    filters.loopable !== null ||
    filters.withPeople !== null ||
    filters.copySpace !== null ||
    filters.platform.length > 0;
  
  if (!hasActiveFilters) {
    return content;
  }
  
  return content.filter(item => {
    const taxonomy = extractVideoTaxonomy(item);
    
    if (filters.useCase.length > 0) {
      const matches = filters.useCase.some(f => taxonomy.useCase.includes(f));
      if (!matches) return false;
    }
    
    if (filters.aiVideos.length > 0) {
      const matches = filters.aiVideos.some(f => taxonomy.aiVideos.includes(f));
      if (!matches) return false;
    }
    
    if (filters.style.length > 0) {
      const matches = filters.style.some(f => taxonomy.style.includes(f));
      if (!matches) return false;
    }
    
    if (filters.format.length > 0) {
      const matches = filters.format.some(f => taxonomy.format.includes(f));
      if (!matches) return false;
    }
    
    if (filters.effects.length > 0) {
      const matches = filters.effects.some(f => taxonomy.effects.includes(f));
      if (!matches) return false;
    }
    
    if (filters.platform.length > 0) {
      const matches = filters.platform.some(f => taxonomy.platform.includes(f));
      if (!matches) return false;
    }
    
    if (filters.orientation !== null) {
      if (taxonomy.orientation !== filters.orientation) return false;
    }
    
    if (filters.resolution !== null) {
      if (taxonomy.resolution !== filters.resolution) return false;
    }
    
    if (filters.aiGenerated !== null) {
      if (taxonomy.isAiGenerated !== filters.aiGenerated) return false;
    }
    
    if (filters.loopable !== null) {
      if (taxonomy.isLoopable !== filters.loopable) return false;
    }
    
    if (filters.withPeople !== null) {
      if (taxonomy.hasPeople !== filters.withPeople) return false;
    }
    
    if (filters.copySpace !== null) {
      if (taxonomy.hasCopySpace !== filters.copySpace) return false;
    }
    
    return true;
  });
}

export function applyPhotoHardFilters(
  content: MarketplaceContent[],
  filters: PhotoFilters
): MarketplaceContent[] {
  const hasActiveFilters = 
    filters.useCase.length > 0 ||
    filters.aiPhotos.length > 0 ||
    filters.style.length > 0 ||
    filters.subject.length > 0 ||
    filters.format.length > 0 ||
    filters.orientation !== null ||
    filters.resolution !== null ||
    filters.aiGenerated !== null ||
    filters.withPeople !== null ||
    filters.numberOfPeople !== null ||
    filters.copySpace !== null ||
    filters.color !== null;
  
  if (!hasActiveFilters) {
    return content;
  }
  
  return content.filter(item => {
    const taxonomy = extractPhotoTaxonomy(item);
    
    if (filters.useCase.length > 0) {
      const matches = filters.useCase.some(f => taxonomy.useCase.includes(f));
      if (!matches) return false;
    }
    
    if (filters.aiPhotos.length > 0) {
      const matches = filters.aiPhotos.some(f => taxonomy.aiPhotos.includes(f));
      if (!matches) return false;
    }
    
    if (filters.subject.length > 0) {
      const matches = filters.subject.some(f => taxonomy.subject.includes(f));
      if (!matches) return false;
    }
    
    if (filters.style.length > 0) {
      const matches = filters.style.some(f => taxonomy.style.includes(f));
      if (!matches) return false;
    }
    
    if (filters.format.length > 0) {
      const matches = filters.format.some(f => taxonomy.format.includes(f));
      if (!matches) return false;
    }
    
    if (filters.orientation !== null) {
      if (taxonomy.orientation !== filters.orientation) return false;
    }
    
    if (filters.resolution !== null) {
      if (taxonomy.resolution !== filters.resolution) return false;
    }
    
    if (filters.aiGenerated !== null) {
      if (taxonomy.isAiGenerated !== filters.aiGenerated) return false;
    }
    
    if (filters.withPeople !== null) {
      if (taxonomy.hasPeople !== filters.withPeople) return false;
    }
    
    if (filters.numberOfPeople !== null) {
      if (taxonomy.numberOfPeople !== filters.numberOfPeople) return false;
    }
    
    if (filters.copySpace !== null) {
      if (taxonomy.hasCopySpace !== filters.copySpace) return false;
    }
    
    if (filters.color !== null) {
      const matches = taxonomy.color.includes(filters.color);
      if (!matches) return false;
    }
    
    return true;
  });
}

// ============================================================================
// SOFT RANKING
// ============================================================================

export function calculateRelevanceRank(
  content: MarketplaceContent,
  searchQuery: string
): number {
  if (!searchQuery.trim()) return 0;
  
  let score = 0;
  const query = searchQuery.toLowerCase();
  const title = content.title?.toLowerCase() || '';
  const tags = (content.tags || []).map(t => t.toLowerCase());
  
  if (title.includes(query)) {
    score += 100;
  }
  
  const queryWords = query.split(/\s+/);
  for (const word of queryWords) {
    if (title.includes(word)) {
      score += 30;
    }
  }
  
  for (const tag of tags) {
    if (tag === query) {
      score += 50;
    } else if (tag.includes(query)) {
      score += 20;
    }
    for (const word of queryWords) {
      if (tag.includes(word)) {
        score += 10;
      }
    }
  }
  
  score += Math.log10(1 + (content.downloads || 0)) * 2;
  score += Math.log10(1 + (content.likes || 0));
  
  return score;
}

// ============================================================================
// FILTER HELPERS
// ============================================================================

export function countActiveVideoFilters(filters: VideoFilters): number {
  let count = 0;
  count += filters.useCase.length;
  count += filters.aiVideos.length;
  count += filters.style.length;
  count += filters.format.length;
  count += filters.effects.length;
  count += filters.platform.length;
  if (filters.orientation !== null) count++;
  if (filters.resolution !== null) count++;
  if (filters.aiGenerated !== null) count++;
  if (filters.loopable !== null) count++;
  if (filters.withPeople !== null) count++;
  if (filters.copySpace !== null) count++;
  return count;
}

export function countActivePhotoFilters(filters: PhotoFilters): number {
  let count = 0;
  count += filters.useCase.length;
  count += filters.aiPhotos.length;
  count += filters.style.length;
  count += filters.subject.length;
  count += filters.format.length;
  if (filters.orientation !== null) count++;
  if (filters.resolution !== null) count++;
  if (filters.aiGenerated !== null) count++;
  if (filters.withPeople !== null) count++;
  if (filters.numberOfPeople !== null) count++;
  if (filters.copySpace !== null) count++;
  if (filters.color !== null) count++;
  if (filters.license !== null) count++;
  return count;
}
