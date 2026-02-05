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
    thumbnail_path: string | null;
    preview_path: string | null;
    file_type: string | null;
  }>;
}

interface ScoredProduct {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  thumbnail_path: string | null;
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
  education: [
    'surgery', 'surgical', 'operating room', 'medical procedure',
    'pilgrimage', 'hajj', 'umrah', 'mecca', 'kaaba',
    'wildlife', 'safari', 'animal behavior',
    'study music', 'studying music', 'relaxing music',
    'coffee', 'latte', 'cappuccino', 'brew',
    'prayer', 'worship', 'mosque', 'church',
  ],
  nature: [
    'marina', 'yacht', 'waterfront', 'skyline', 'skyscraper',
    'port', 'shipping', 'container', 'cargo',
    'pool', 'swimming pool', 'water park',
    'fountain', 'water feature',
    'dubai', 'urban', 'city center', 'downtown',
  ],
  business: [
    'music production', 'professional audio', 'professional quality',
    'professional camera', 'professional photography',
    'surgery', 'medical', 'hospital', 'clinic',
    'sports team', 'football team', 'soccer team',
  ],
  technology: [
    'digital art', 'digital painting', 'digital download',
    'nature', 'wildlife', 'landscape',
  ],
  travel: [
    'city life', 'city living', 'urban lifestyle',
    'local business', 'city traffic',
  ],
  health: [
    'financial health', 'business health', 'health of the economy',
    'healthy profit', 'healthy growth',
  ],
  lifestyle: [
    // Lifestyle is broad by design, minimal exclusions
  ],
  music: [
    // Audio-only, handled by category gating
  ],
  food: [
    'food for thought', 'food chain', 'food industry logistics',
  ],
  abstract: [
    // Abstract is broad, minimal exclusions
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
  
  for (const product of products) {
    if (!product.slug) continue;
    
    const { score, reasons } = calculateConfidenceScore(product, collection);
    
    if (score >= minConfidence) {
      const primaryFile = product.content_files?.[0];
      scored.push({
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        thumbnail_path: primaryFile?.thumbnail_path || null,
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
