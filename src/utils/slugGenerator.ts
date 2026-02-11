/**
 * Generates SEO-friendly URL slugs from title and tags
 * Features:
 * - Lowercase only
 * - Hyphens instead of spaces
 * - Removes accents and special characters
 * - Removes common stop-words
 * - Keywords ordered by importance (from tags first, then title)
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
  // French stop words
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
  'pour', 'dans', 'sur', 'avec', 'sans', 'sous', 'par', 'au', 'aux', 'ce',
  'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'qui', 'que', 'quoi',
  'dont', 'où', 'si', 'ne', 'pas', 'plus', 'moins', 'très', 'aussi', 'encore'
]);

/**
 * Remove accents from string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Clean and normalize a word
 */
function cleanWord(word: string): string {
  return removeAccents(word)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string, maxWords: number = 10): string[] {
  const words = text
    .split(/[\s\-_,\.]+/)
    .map(cleanWord)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  
  // Remove duplicates while preserving order
  const uniqueWords = Array.from(new Set(words));
  
  return uniqueWords.slice(0, maxWords);
}

/**
 * Generate SEO-friendly slug from title and tags
 * 
 * @param title - Product title
 * @param tags - Product tags (most important keywords should be first)
 * @param maxLength - Maximum slug length (default: 60 characters)
 * @returns SEO-friendly slug
 * 
 * @example
 * generateSlug(
 *   "Aerial Shot of Speedboat on Beach", 
 *   ["aerial", "speedboat", "beach", "ocean", "vacation"]
 * )
 * // Returns: "aerial-speedboat-beach-ocean-vacation-shot"
 */
export function generateSlug(title: string, tags: string[] = [], maxLength: number = 60): string {
  // Extract keywords from tags first (they're more important)
  const tagKeywords = tags
    .map(cleanWord)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  
  // Extract keywords from title
  const titleKeywords = extractKeywords(title);
  
  // Combine: tags first (most important), then title keywords
  // Remove duplicates while preserving order
  const allKeywords: string[] = [];
  const seen = new Set<string>();
  
  // Add tag keywords first
  for (const keyword of tagKeywords) {
    if (!seen.has(keyword)) {
      allKeywords.push(keyword);
      seen.add(keyword);
    }
  }
  
  // Add title keywords
  for (const keyword of titleKeywords) {
    if (!seen.has(keyword)) {
      allKeywords.push(keyword);
      seen.add(keyword);
    }
  }
  
  // Build slug, respecting max length
  let slug = '';
  for (const keyword of allKeywords) {
    const testSlug = slug ? `${slug}-${keyword}` : keyword;
    if (testSlug.length > maxLength) break;
    slug = testSlug;
  }
  
  // Fallback if slug is empty
  if (!slug) {
    slug = cleanWord(title).slice(0, maxLength);
  }
  
  return slug;
}

/**
 * Ensure slug is unique by appending a number if needed
 * 
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  const existingSet = new Set(existingSlugs);
  
  while (existingSet.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Generate a slugified file name from title, preserving the original file extension
 * 
 * @param title - Product title to slugify
 * @param originalFileName - Original file name to extract extension from
 * @returns Slugified file name with original extension
 * 
 * @example
 * generateSlugifiedFileName("Aerial Shot of Speedboat", "image_304d2e.jpg")
 * // Returns: "aerial-shot-speedboat.jpg"
 */
/**
 * Slugify a store name for use in seller URLs
 * e.g. "Lumostock Media" -> "lumostock-media"
 */
export function slugifyStoreName(storeName: string): string {
  return removeAccents(storeName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'store';
}

export function generateSlugifiedFileName(title: string, originalFileName: string): string {
  // Extract the file extension from original filename
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalFileName.slice(lastDotIndex) : '';
  
  // Generate slug from title (max 50 chars to leave room for extension)
  const slug = generateSlug(title, [], 50);
  
  // Combine slug with original extension
  return slug + extension.toLowerCase();
}
