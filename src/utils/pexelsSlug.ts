/**
 * Generate SEO-friendly slugs for Pexels assets.
 * Format: {type}-{numericId}-{keywords}
 * Example: photo-12345-business-team-meeting-office
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
]);

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')   // keep alphanumeric, spaces, hyphens
    .trim();
}

export function generatePexelsSlug(
  type: 'photo' | 'video',
  numericId: number,
  title?: string,
  alt?: string,
): string {
  const rawText = alt || title || '';
  const words = cleanText(rawText)
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 6); // max 6 keywords for URL readability

  const keywordPart = words.length > 0 ? `-${words.join('-')}` : '';
  return `${type}-${numericId}${keywordPart}`;
}

/**
 * Parse a Pexels slug back to type + numericId.
 * Accepts: "photo-12345-business-team" or "video-99999-sunset"
 */
export function parsePexelsSlug(slug: string): { type: 'photo' | 'video'; numericId: number } | null {
  const match = slug.match(/^(photo|video)-(\d+)/);
  if (!match) return null;
  return {
    type: match[1] as 'photo' | 'video',
    numericId: parseInt(match[2], 10),
  };
}

/**
 * Generate a marketplace-style product slug for a Pexels asset.
 * Format: free-{type}-{keywords}-pexels-{numericId}
 * Example: free-photo-business-team-meeting-pexels-12345
 */
export function generatePexelsProductSlug(
  type: 'photo' | 'video',
  numericId: number,
  title?: string,
  alt?: string,
): string {
  const rawText = alt || title || '';
  const words = cleanText(rawText)
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 6);

  const keywordPart = words.length > 0 ? `-${words.join('-')}` : '';
  return `free-${type}${keywordPart}-pexels-${numericId}`;
}

/**
 * Parse a marketplace-style Pexels product slug.
 * Accepts: "free-photo-business-team-pexels-12345" or "free-video-sunset-pexels-99999"
 */
export function parsePexelsProductSlug(slug: string): { type: 'photo' | 'video'; numericId: number } | null {
  const match = slug.match(/^free-(photo|video)-.*-pexels-(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as 'photo' | 'video',
    numericId: parseInt(match[2], 10),
  };
}

/**
 * Quick check if a slug is a Pexels product slug.
 */
export function isPexelsProductSlug(slug: string): boolean {
  return /^free-(photo|video)-.*-pexels-\d+$/.test(slug);
}
