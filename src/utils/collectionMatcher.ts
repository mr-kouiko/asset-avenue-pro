/**
 * Collection Matching Utility
 * 
 * Implements tiered confidence scoring for collection relevance:
 * - TIER 1 (HIGH): Exact tag match OR title contains primary term
 * - TIER 2 (MEDIUM): Multiple term matches with corroboration
 * - TIER 3 (LOW): Single description mention - EXCLUDED
 * 
 * Rules:
 * - No non-semantic fallback (popular/latest/random) under any circumstance
 * - Minimum confidence threshold for asset inclusion
 * - Collections with < MIN_ITEMS must noindex
 */

import type { SEOCollection } from '@/data/seoCollections';

export const MIN_ITEMS_FOR_INDEX = 6;
export const MIN_ITEMS_TO_DISPLAY = 3;

interface ContentSubmission {
  id: string;
  title: string;
  description: string;
  tags: string[] | null;
  slug: string | null;
  price: number | null;
  content_files?: Array<{ 
    file_path: string | null; thumbnail_path: string | null;
    preview_path: string | null;
    file_type: string | null;
  }>;
}

interface ScoredProduct {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  file_path: string | null; thumbnail_path: string | null;
  preview_path: string | null;
  file_type: string | null;
  confidenceScore: number;
  matchReasons: string[];
}

/**
 * Per-collection exclusion keywords to filter false positives
 * These terms disqualify an asset even if it matches positive terms
 */
export const collectionExclusions: Record<string, string[]> = {
  // EDUCATION: Academic/learning only - exclude medical, religious, leisure, lifestyle
  education: [
    // Medical
    'surgery', 'surgical', 'operating room', 'medical procedure', 'hospital', 'patient',
    // Religious
    'pilgrimage', 'hajj', 'umrah', 'mecca', 'kaaba', 'prayer', 'worship', 'mosque', 'church', 'temple',
    // Wildlife/Nature
    'wildlife', 'safari', 'animal behavior', 'jungle', 'forest', 'mountain',
    // Audio misleading terms
    'study music', 'studying music', 'relaxing music', 'focus music', 'concentration music',
    // Food/Beverage
    'coffee', 'latte', 'cappuccino', 'brew', 'restaurant', 'cooking', 'recipe',
    // Leisure/Lifestyle
    'bikini', 'swimsuit', 'pool', 'beach', 'vacation', 'resort', 'spa', 'relaxing',
    'nightclub', 'party', 'bar', 'drinking', 'cocktail',
    // Fashion
    'fashion', 'runway', 'model', 'lingerie', 'sexy',
    // Sports
    'football', 'soccer', 'basketball', 'tennis', 'golf', 'extreme sport',
  ],
  
  // NATURE: Wilderness/outdoors only - exclude urban, man-made, lifestyle
  nature: [
    // Urban/Architecture
    'marina', 'yacht', 'waterfront property', 'skyline', 'skyscraper', 'building', 'architecture',
    'port', 'shipping', 'container', 'cargo', 'industrial', 'factory', 'warehouse',
    'dubai', 'urban', 'city center', 'downtown', 'street', 'road', 'highway',
    // Man-made water features
    'pool', 'swimming pool', 'water park', 'fountain', 'water feature', 'aquarium',
    // Technology
    'computer', 'laptop', 'smartphone', 'software', 'coding', 'technology', 'digital',
    // Business
    'office', 'meeting', 'corporate', 'business', 'boardroom', 'presentation',
    // Fashion/Lifestyle
    'fashion', 'model', 'runway', 'bikini', 'lingerie', 'sexy',
    // Food
    'restaurant', 'cooking', 'chef', 'cuisine', 'recipe', 'kitchen',
    // Sports (non-outdoor)
    'gym', 'fitness center', 'basketball court', 'tennis court',
  ],
  
  // BUSINESS: Corporate/professional only - exclude leisure, medical, creative arts
  business: [
    // Audio misleading terms
    'music production', 'professional audio', 'professional quality',
    'professional camera', 'professional photography equipment',
    // Medical
    'surgery', 'medical', 'hospital', 'clinic', 'doctor', 'nurse', 'patient',
    // Sports
    'sports team', 'football team', 'soccer team', 'basketball', 'athlete',
    // Nature/Wildlife
    'nature', 'wildlife', 'forest', 'mountain', 'jungle', 'safari', 'ocean', 'beach',
    // Leisure
    'vacation', 'holiday', 'resort', 'spa', 'relaxing', 'pool', 'swimming',
    'bikini', 'swimsuit', 'sunbathing',
    // Entertainment
    'party', 'nightclub', 'concert', 'festival', 'wedding', 'bride',
    // Fashion (non-business)
    'lingerie', 'sexy', 'sensual', 'swimwear',
    // Food (unless business lunch)
    'cooking', 'recipe', 'chef', 'baking',
    // Art/Creative
    'painting', 'sculpture', 'gallery', 'museum', 'artist studio',
  ],
  
  // TECHNOLOGY: Tech/digital only - exclude lifestyle, nature, creative arts
  technology: [
    // Art terms that include "digital"
    'digital art', 'digital painting', 'digital download', 'digital print',
    // Nature
    'nature', 'wildlife', 'landscape', 'forest', 'mountain', 'ocean', 'beach', 'sunset', 'sunrise',
    // Leisure/Lifestyle
    'bikini', 'swimsuit', 'swimwear', 'pool', 'swimming pool', 'poolside',
    'beach', 'relaxing', 'sunbathing', 'vacation', 'resort', 'spa', 'wellness',
    'woman relaxing', 'man relaxing', 'couple relaxing',
    // Fashion
    'fashion model', 'lingerie', 'sexy', 'sensual', 'runway', 'fashion show',
    // Wellness (non-tech)
    'yoga', 'meditation', 'wellness retreat', 'massage', 'therapy',
    // Food
    'cooking', 'food', 'recipe', 'kitchen', 'restaurant', 'chef', 'cuisine',
    // Events
    'wedding', 'bride', 'romantic', 'party', 'celebration', 'birthday',
    // Sports
    'football', 'soccer', 'basketball', 'tennis', 'golf', 'gym workout',
    // Animals
    'pet', 'dog', 'cat', 'horse', 'animal', 'wildlife',
  ],
  
  // TRAVEL: Destinations/tourism only - exclude local daily life, pure technology
  travel: [
    // Local/Urban daily life
    'city life', 'city living', 'urban lifestyle', 'commute', 'commuting',
    'local business', 'city traffic', 'office work', 'daily routine',
    // Pure technology
    'coding', 'programming', 'software development', 'computer screen',
    // Medical
    'hospital', 'surgery', 'medical', 'doctor', 'clinic',
    // Industrial
    'factory', 'warehouse', 'industrial', 'manufacturing',
    // Abstract only
    'abstract pattern', 'geometric shape', 'texture only',
    // Fashion (studio)
    'fashion shoot', 'studio model', 'lingerie', 'sexy',
  ],
  
  // HEALTH: Medical/wellness only - exclude business terms, pure leisure
  health: [
    // Business metaphors using "health"
    'financial health', 'business health', 'health of the economy',
    'healthy profit', 'healthy growth', 'market health',
    // Pure technology
    'coding', 'programming', 'software', 'computer science',
    // Travel/Tourism
    'tourist', 'tourism', 'destination', 'landmark', 'sightseeing',
    // Pure entertainment
    'nightclub', 'party', 'bar', 'concert', 'festival',
    // Fashion
    'fashion show', 'runway', 'lingerie', 'sexy', 'sensual',
    // Food (unless healthy eating)
    'junk food', 'fast food', 'fried', 'burger', 'pizza', 'candy',
    // Industrial
    'factory', 'warehouse', 'industrial', 'manufacturing',
  ],
  
  // LIFESTYLE: Daily life/people - exclude pure industrial, abstract, medical procedures
  lifestyle: [
    // Medical procedures
    'surgery', 'surgical', 'operating room', 'medical procedure',
    // Industrial
    'factory', 'warehouse', 'industrial', 'manufacturing', 'machinery',
    // Pure abstract
    'abstract pattern', 'geometric texture', 'color gradient only',
    // Pure technology (no humans)
    'circuit board', 'server room', 'data center', 'code only',
    // Scientific
    'laboratory experiment', 'chemical', 'microscope view',
  ],
  
  // MUSIC: Audio content only - category restricted, minimal exclusions
  music: [
    // Visual-only terms
    'music video', 'concert photo', 'album cover design',
    // Non-audio music references
    'music room decor', 'music poster', 'music artwork',
  ],
  
  // FOOD: Culinary only - exclude non-food lifestyle, pure nature
  food: [
    // Business metaphors
    'food for thought', 'food chain business', 'food industry logistics',
    // Pure nature (not farm/agriculture)
    'wildlife', 'safari', 'jungle', 'forest hike', 'mountain climbing',
    // Technology
    'coding', 'programming', 'software', 'computer',
    // Fashion
    'fashion', 'runway', 'model', 'lingerie', 'bikini',
    // Sports
    'football', 'soccer', 'basketball', 'tennis', 'gym workout',
    // Medical
    'surgery', 'hospital', 'medical procedure',
    // Entertainment (non-dining)
    'concert', 'nightclub', 'party dancing',
  ],
  
  // ABSTRACT: Patterns/textures/art - exclude realistic photos, specific subjects
  abstract: [
    // Realistic people
    'portrait', 'person', 'people', 'man', 'woman', 'child', 'family', 'couple',
    'face', 'eyes', 'hands', 'body',
    // Specific locations
    'city', 'building', 'landmark', 'street', 'road', 'destination',
    // Animals
    'animal', 'pet', 'dog', 'cat', 'wildlife', 'bird', 'fish',
    // Food
    'food', 'dish', 'meal', 'cooking', 'restaurant', 'chef',
    // Nature (realistic)
    'landscape photo', 'nature photography', 'wildlife photo',
    // Fashion/Lifestyle
    'fashion', 'bikini', 'swimsuit', 'lingerie', 'model',
    // Sports
    'sports', 'football', 'soccer', 'basketball', 'athlete',
    // Business
    'office', 'meeting', 'corporate', 'businessperson',
  ],
};

/**
 * Primary terms that indicate the collection is the MAIN topic
 * These carry higher weight than secondary/contextual terms
 */
export const collectionPrimaryTerms: Record<string, string[]> = {
  education: ['education', 'school', 'classroom', 'university', 'college', 'teacher', 'student', 'academic', 'curriculum'],
  nature: ['nature', 'wilderness', 'forest', 'mountain', 'wildlife', 'natural landscape', 'national park'],
  business: ['business', 'corporate', 'boardroom', 'executive', 'enterprise', 'startup'],
  technology: ['technology', 'software', 'coding', 'programming', 'tech industry', 'IT', 'cybersecurity'],
  travel: ['travel', 'tourism', 'destination', 'vacation', 'holiday', 'tourist', 'adventure travel'],
  health: ['healthcare', 'medical', 'hospital', 'doctor', 'nurse', 'patient care', 'wellness', 'fitness'],
  lifestyle: ['lifestyle', 'daily life', 'home life', 'family life', 'modern living'],
  music: ['music', 'musical', 'musician', 'instrument', 'concert', 'band', 'orchestra'],
  food: ['food', 'cooking', 'cuisine', 'recipe', 'chef', 'restaurant', 'dish', 'meal'],
  abstract: ['abstract', 'geometric', 'pattern', 'texture', 'gradient', 'minimalist'],
};

/**
 * Category restrictions for collections
 * null = all categories allowed
 */
export const collectionCategoryRestrictions: Record<string, string[] | null> = {
  music: ['audio'], // Music collection should only show audio content
  education: null,
  nature: ['photo', 'video'],
  business: ['photo', 'video'],
  technology: ['photo', 'video', 'vector'],
  travel: ['photo', 'video'],
  health: ['photo', 'video'],
  lifestyle: ['photo', 'video'],
  food: ['photo', 'video'],
  abstract: ['photo', 'video', 'vector'],
};

/**
 * Map MIME file type to category for restriction matching
 */
export function fileTypeToCategory(fileType: string | null): string | null {
  if (!fileType) return null;
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('image/')) return 'photo';
  if (fileType.includes('svg') || fileType.includes('vector')) return 'vector';
  return null;
}

/**
 * Calculate confidence score for a product matching a collection
 * Returns 0 if the product should be excluded
 */
export function calculateConfidenceScore(
  product: ContentSubmission,
  collection: SEOCollection
): { score: number; reasons: string[] } {
  const title = product.title.toLowerCase();
  const description = product.description.toLowerCase();
  const tags = (product.tags || []).map(t => t.toLowerCase());
  
  let score = 0;
  const reasons: string[] = [];
  
  const exclusions = collectionExclusions[collection.id] || [];
  const primaryTerms = collectionPrimaryTerms[collection.id] || [];
  
  // CHECK EXCLUSIONS FIRST - any match = immediate disqualification
  for (const exclusion of exclusions) {
    const exclusionLower = exclusion.toLowerCase();
    if (
      title.includes(exclusionLower) ||
      description.includes(exclusionLower) ||
      tags.some(t => t.includes(exclusionLower))
    ) {
      return { score: 0, reasons: [`excluded: ${exclusion}`] };
    }
  }
  
  // TIER 1: Exact tag match (HIGH confidence)
  for (const term of collection.searchQueries) {
    const termLower = term.toLowerCase();
    if (tags.includes(termLower)) {
      // Primary term in tags = highest confidence
      if (primaryTerms.some(p => p.toLowerCase() === termLower)) {
        score += 30;
        reasons.push(`tag:${term} (primary)`);
      } else {
        score += 20;
        reasons.push(`tag:${term}`);
      }
    }
  }
  
  // TIER 1: Title contains primary term (HIGH confidence)
  for (const term of primaryTerms) {
    const termLower = term.toLowerCase();
    if (title.includes(termLower)) {
      score += 25;
      reasons.push(`title:${term}`);
    }
  }
  
  // TIER 2: Title contains secondary search term (MEDIUM confidence)
  for (const term of collection.searchQueries) {
    const termLower = term.toLowerCase();
    if (!primaryTerms.some(p => p.toLowerCase() === termLower)) {
      if (title.includes(termLower)) {
        score += 10;
        reasons.push(`title:${term} (secondary)`);
      }
    }
  }
  
  // TIER 2: Description contains term + corroborated by tag (MEDIUM confidence)
  for (const term of collection.searchQueries) {
    const termLower = term.toLowerCase();
    const inDescription = description.includes(termLower);
    const hasCorroboratingTag = tags.some(t => 
      collection.searchQueries.some(q => t.includes(q.toLowerCase()))
    );
    
    if (inDescription && hasCorroboratingTag && !reasons.some(r => r.includes(term))) {
      score += 8;
      reasons.push(`desc+tag:${term}`);
    }
  }
  
  // TIER 3: Single description mention without corroboration = LOW confidence
  // We don't add score for these - they're filtered out by minimum threshold
  
  // BONUS: Multiple matches indicate stronger relevance
  if (reasons.filter(r => !r.startsWith('excluded')).length >= 3) {
    score += 10;
    reasons.push('multi-match bonus');
  }
  
  return { score, reasons };
}

/**
 * Filter and score products for a collection
 * Returns only products meeting minimum confidence threshold
 */
export function filterProductsForCollection(
  products: ContentSubmission[],
  collection: SEOCollection,
  minConfidence: number = 15 // Minimum score to include
): ScoredProduct[] {
  const scored: ScoredProduct[] = [];
  
  // Get category restrictions for this collection (null = all allowed)
  const allowedCategories = collectionCategoryRestrictions[collection.id];
  
  for (const product of products) {
    if (!product.slug) continue;
    
    const primaryFile = product.content_files?.[0];
    
    // CATEGORY RESTRICTION CHECK - skip products with wrong file type
    if (allowedCategories !== null) {
      const productCategory = fileTypeToCategory(primaryFile?.file_type || null);
      
      // If we can determine category and it's not allowed, skip
      if (productCategory && !allowedCategories.includes(productCategory)) {
        continue;
      }
    }
    
    const { score, reasons } = calculateConfidenceScore(product, collection);
    
    if (score >= minConfidence) {
      scored.push({
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        file_path: primaryFile?.file_path || null, thumbnail_path: primaryFile?.thumbnail_path || null,
        preview_path: primaryFile?.preview_path || null,
        file_type: primaryFile?.file_type || null,
        confidenceScore: score,
        matchReasons: reasons,
      });
    }
  }
  
  // Sort by confidence score (highest first)
  return scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Determine if a collection should be noindexed based on content quality
 */
export function shouldNoIndexCollection(validItemCount: number): boolean {
  return validItemCount < MIN_ITEMS_FOR_INDEX;
}

/**
 * Determine if a collection should show empty state (not enough content)
 */
export function shouldShowEmptyState(validItemCount: number): boolean {
  return validItemCount < MIN_ITEMS_TO_DISPLAY;
}
