/**
 * Intent-Based Search Engine
 * Prioritizes exact matches, applies strict relevance filtering,
 * and ranks by intent match first, then contextual relevance.
 */

// Synonym mappings for common search terms
const synonyms: Record<string, string[]> = {
  // Content types
  'photo': ['image', 'picture', 'pic', 'photograph', 'snapshot'],
  'video': ['footage', 'clip', 'movie', 'film', 'recording'],
  'audio': ['sound', 'music', 'track', 'song', 'melody', 'tune'],
  'illustration': ['drawing', 'artwork', 'art', 'graphic', 'sketch'],
  
  // Nature
  'nature': ['natural', 'outdoor', 'outdoors', 'wilderness', 'landscape'],
  'forest': ['woods', 'trees', 'woodland', 'jungle'],
  'ocean': ['sea', 'water', 'marine', 'beach', 'coast'],
  'mountain': ['mountains', 'hill', 'hills', 'peak', 'summit'],
  'sky': ['clouds', 'sunset', 'sunrise', 'atmosphere'],
  
  // Urban/Architecture
  'city': ['urban', 'downtown', 'metropolitan', 'cityscape'],
  'building': ['architecture', 'structure', 'construction', 'edifice'],
  'street': ['road', 'avenue', 'boulevard', 'highway'],
  
  // People
  'people': ['person', 'human', 'humans', 'crowd', 'group'],
  'woman': ['women', 'female', 'lady', 'girl'],
  'man': ['men', 'male', 'guy', 'gentleman'],
  'business': ['corporate', 'office', 'professional', 'work'],
  
  // Moods/Styles
  'happy': ['joyful', 'cheerful', 'bright', 'positive'],
  'sad': ['melancholy', 'somber', 'dark', 'moody'],
  'calm': ['peaceful', 'serene', 'tranquil', 'relaxing'],
  'epic': ['cinematic', 'dramatic', 'grand', 'majestic'],
  
  // Technology
  'technology': ['tech', 'digital', 'electronic', 'computer'],
  
  // Travel
  'travel': ['tourism', 'vacation', 'trip', 'journey', 'adventure'],
  'dubai': ['uae', 'emirates', 'arab'],
  
  // Abstract
  'abstract': ['conceptual', 'artistic', 'modern'],
  'background': ['backdrop', 'wallpaper', 'texture'],
};

// Build reverse lookup for faster synonym matching
const synonymLookup: Record<string, string> = {};
Object.entries(synonyms).forEach(([key, values]) => {
  values.forEach(value => {
    synonymLookup[value.toLowerCase()] = key.toLowerCase();
  });
});

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function similarityScore(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 1;
  
  const maxLength = Math.max(aLower.length, bLower.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(aLower, bLower);
  return 1 - distance / maxLength;
}

/**
 * Check if two words are synonyms
 */
export function areSynonyms(word1: string, word2: string): boolean {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();
  
  // Direct match
  if (w1 === w2) return true;
  
  // Check if both map to the same canonical term
  const canonical1 = synonymLookup[w1] || w1;
  const canonical2 = synonymLookup[w2] || w2;
  
  if (canonical1 === canonical2) return true;
  
  // Check if one is in the other's synonym list
  if (synonyms[w1]?.includes(w2) || synonyms[w2]?.includes(w1)) return true;
  
  return false;
}

/**
 * Expand search query with synonyms
 */
export function expandWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>(words);
  
  words.forEach(word => {
    // Add canonical term
    const canonical = synonymLookup[word];
    if (canonical) {
      expanded.add(canonical);
    }
    
    // Add all synonyms of the word
    if (synonyms[word]) {
      synonyms[word].forEach(syn => expanded.add(syn));
    }
    
    // If word maps to a canonical term, add all its synonyms
    if (canonical && synonyms[canonical]) {
      synonyms[canonical].forEach(syn => expanded.add(syn));
    }
  });
  
  return Array.from(expanded);
}

/**
 * Tokenize text into searchable words
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
}

/**
 * Searchable content interface
 */
export interface SearchableContent {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  author?: string;
  type?: string;
  category?: string;
  location?: string;
  price?: number;
  downloads?: number;
  likes?: number;
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  matchedTerms: string[];
  intentMatch: 'exact' | 'strong' | 'partial' | 'weak';
}

/**
 * Intent classification for search queries
 */
interface SearchIntent {
  primaryTerms: string[];      // Main intent keywords (must match)
  modifierTerms: string[];     // Optional refinement terms
  categoryHint?: string;       // Detected category intent
  locationHint?: string;       // Detected location intent
}

/**
 * Parse search query into structured intent
 */
function parseSearchIntent(query: string): SearchIntent {
  const tokens = tokenize(query);
  const primaryTerms: string[] = [];
  const modifierTerms: string[] = [];
  let categoryHint: string | undefined;
  let locationHint: string | undefined;
  
  // Category keywords
  const categoryKeywords = ['photo', 'image', 'video', 'audio', 'music', 'sound', 'illustration'];
  
  // Common modifiers (less important for matching)
  const modifiers = ['beautiful', 'amazing', 'stunning', 'professional', 'high', 'quality', 
                     'best', 'top', 'new', 'latest', 'free', 'premium', 'hd', '4k', '8k'];
  
  tokens.forEach(token => {
    // Check if it's a category keyword
    if (categoryKeywords.some(cat => areSynonyms(token, cat))) {
      categoryHint = synonymLookup[token] || token;
      return;
    }
    
    // Check if it's a modifier
    if (modifiers.includes(token)) {
      modifierTerms.push(token);
      return;
    }
    
    // Otherwise it's a primary term
    primaryTerms.push(token);
  });
  
  return {
    primaryTerms,
    modifierTerms,
    categoryHint,
    locationHint
  };
}

/**
 * Calculate intent-based relevance score
 * Prioritizes exact matches on core fields, applies strict filtering
 */
export function calculateRelevanceScore(
  content: SearchableContent,
  searchTerms: string[],
  expandedTerms: string[]
): ScoredResult<SearchableContent> | null {
  const intent = parseSearchIntent(searchTerms.join(' '));
  
  let score = 0;
  const matchedTerms: string[] = [];
  let exactTitleMatches = 0;
  let exactTagMatches = 0;
  let exactCategoryMatches = 0;
  
  const titleLower = (content.title || '').toLowerCase();
  const titleTokens = tokenize(content.title || '');
  const descTokens = tokenize(content.description || '');
  const tagTokens = (content.tags || []).flatMap(tag => tokenize(tag));
  const tagsLower = (content.tags || []).map(t => t.toLowerCase());
  const categoryTokens = tokenize(content.category || content.type || '');
  const locationTokens = tokenize(content.location || '');
  
  // ============ PHASE 1: EXACT MATCH DETECTION (Highest Priority) ============
  
  for (const term of intent.primaryTerms) {
    let termMatched = false;
    
    // EXACT TITLE MATCH - Highest priority (word boundary)
    if (titleTokens.includes(term)) {
      score += 200;
      exactTitleMatches++;
      termMatched = true;
      matchedTerms.push(term);
    }
    // EXACT TITLE CONTAINS (phrase in title)
    else if (titleLower.includes(term)) {
      score += 150;
      termMatched = true;
      matchedTerms.push(term);
    }
    
    // EXACT TAG MATCH - Second highest priority
    if (tagsLower.includes(term) || tagTokens.includes(term)) {
      score += 120;
      exactTagMatches++;
      if (!termMatched) {
        termMatched = true;
        matchedTerms.push(term);
      }
    }
    
    // EXACT CATEGORY MATCH
    if (categoryTokens.includes(term)) {
      score += 100;
      exactCategoryMatches++;
      if (!termMatched) {
        termMatched = true;
        matchedTerms.push(term);
      }
    }
    
    // EXACT LOCATION MATCH
    if (locationTokens.includes(term)) {
      score += 100;
      if (!termMatched) {
        termMatched = true;
        matchedTerms.push(term);
      }
    }
    
    // If no exact match found, try fuzzy but with stricter threshold
    if (!termMatched) {
      // Fuzzy title match (strict threshold 0.85)
      for (const titleWord of titleTokens) {
        const sim = similarityScore(term, titleWord);
        if (sim >= 0.85) {
          score += 80 * sim;
          matchedTerms.push(term);
          termMatched = true;
          break;
        }
      }
    }
    
    // Fuzzy tag match only if still no match (strict threshold 0.85)
    if (!termMatched) {
      for (const tagWord of tagTokens) {
        const sim = similarityScore(term, tagWord);
        if (sim >= 0.85) {
          score += 60 * sim;
          matchedTerms.push(term);
          termMatched = true;
          break;
        }
      }
    }
    
    // Description match only for exact word matches (lower weight)
    if (!termMatched && descTokens.includes(term)) {
      score += 30;
      matchedTerms.push(term);
      termMatched = true;
    }
  }
  
  // ============ PHASE 2: STRICT RELEVANCE FILTERING ============
  
  // CRITICAL: Require at least one primary term to match
  // This prevents loosely related or ambiguous results
  if (intent.primaryTerms.length > 0 && matchedTerms.length === 0) {
    return null; // No match on any primary term = exclude
  }
  
  // Calculate match ratio for intent alignment
  const primaryMatchRatio = intent.primaryTerms.length > 0 
    ? matchedTerms.filter(t => intent.primaryTerms.includes(t)).length / intent.primaryTerms.length
    : 1;
  
  // Require at least 50% of primary terms to match for multi-word queries
  if (intent.primaryTerms.length >= 2 && primaryMatchRatio < 0.5) {
    return null; // Not enough intent alignment
  }
  
  // ============ PHASE 3: SYNONYM BONUS (Small boost only) ============
  
  for (const expandedTerm of expandedTerms) {
    if (!searchTerms.includes(expandedTerm)) {
      // Only boost if primary terms already matched
      if (matchedTerms.length > 0) {
        if (titleTokens.some(token => areSynonyms(token, expandedTerm))) {
          score += 20;
        } else if (tagTokens.some(token => areSynonyms(token, expandedTerm))) {
          score += 10;
        }
      }
    }
  }
  
  // ============ PHASE 4: MODIFIER TERM BONUSES ============
  
  for (const modifier of intent.modifierTerms) {
    if (titleTokens.includes(modifier) || tagTokens.includes(modifier)) {
      score += 15;
    }
  }
  
  // ============ PHASE 5: INTENT MATCH CLASSIFICATION ============
  
  let intentMatch: 'exact' | 'strong' | 'partial' | 'weak';
  
  if (exactTitleMatches >= intent.primaryTerms.length && intent.primaryTerms.length > 0) {
    intentMatch = 'exact';
    score *= 1.5; // Boost exact intent matches significantly
  } else if (exactTitleMatches > 0 || (exactTagMatches >= intent.primaryTerms.length && intent.primaryTerms.length > 0)) {
    intentMatch = 'strong';
    score *= 1.2;
  } else if (primaryMatchRatio >= 0.5) {
    intentMatch = 'partial';
  } else {
    intentMatch = 'weak';
    score *= 0.7; // Penalize weak matches
  }
  
  // ============ PHASE 6: POPULARITY BOOST (Minimal influence) ============
  
  // Only apply popularity boost after intent matching
  const popularityBoost = Math.log10(1 + (content.downloads || 0) + (content.likes || 0));
  score += popularityBoost; // Max ~3-4 points for very popular items
  
  // ============ FINAL THRESHOLD ============
  
  // Minimum score threshold based on query complexity
  const minScoreThreshold = intent.primaryTerms.length > 1 ? 50 : 30;
  
  if (score < minScoreThreshold) {
    return null;
  }
  
  return {
    item: content,
    score,
    matchedTerms,
    intentMatch
  };
}

/**
 * Perform intent-based search with strict relevance ranking
 */
export function fuzzySearch<T extends SearchableContent>(
  items: T[],
  query: string,
  options: {
    minScore?: number;
    maxResults?: number;
    strictMode?: boolean; // New: Enable stricter filtering
  } = {}
): ScoredResult<T>[] {
  const { minScore = 30, maxResults = 100, strictMode = true } = options;
  
  if (!query.trim()) {
    return items.map(item => ({ item, score: 0, matchedTerms: [], intentMatch: 'exact' as const }));
  }
  
  const searchTerms = tokenize(query);
  const expandedTerms = expandWithSynonyms(query);
  
  const results: ScoredResult<T>[] = [];
  
  for (const item of items) {
    const result = calculateRelevanceScore(item, searchTerms, expandedTerms);
    if (result && result.score >= minScore) {
      results.push(result as ScoredResult<T>);
    }
  }
  
  // Sort by: 1) Intent match type, 2) Score descending
  results.sort((a, b) => {
    // Intent match priority
    const intentPriority = { exact: 4, strong: 3, partial: 2, weak: 1 };
    const intentDiff = intentPriority[b.intentMatch] - intentPriority[a.intentMatch];
    if (intentDiff !== 0) return intentDiff;
    
    // Then by score
    return b.score - a.score;
  });
  
  // In strict mode, limit weak matches
  if (strictMode) {
    const strongResults = results.filter(r => r.intentMatch !== 'weak');
    const weakResults = results.filter(r => r.intentMatch === 'weak');
    
    // Only include weak matches if we don't have enough strong ones
    if (strongResults.length >= 10) {
      return strongResults.slice(0, maxResults);
    }
    
    // Include some weak matches to fill up to minimum
    const neededWeak = Math.min(10 - strongResults.length, weakResults.length);
    return [...strongResults, ...weakResults.slice(0, neededWeak)].slice(0, maxResults);
  }
  
  return results.slice(0, maxResults);
}

/**
 * Generate search suggestions based on partial input
 */
export function generateSuggestions(
  query: string,
  items: SearchableContent[],
  maxSuggestions: number = 8
): string[] {
  if (!query.trim() || query.length < 2) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  const suggestions = new Map<string, number>();
  
  // Collect all unique terms from items
  items.forEach(item => {
    const allTerms = [
      ...tokenize(item.title || ''),
      ...(item.tags || []).map(t => t.toLowerCase()),
      item.type?.toLowerCase(),
      item.category?.toLowerCase()
    ].filter(Boolean) as string[];
    
    allTerms.forEach(term => {
      if (term.length >= 2) {
        // Exact prefix match (highest priority)
        if (term.startsWith(queryLower)) {
          suggestions.set(term, (suggestions.get(term) || 0) + 15);
        }
        // Contains query (medium priority)
        else if (term.includes(queryLower)) {
          suggestions.set(term, (suggestions.get(term) || 0) + 5);
        }
        // Fuzzy match (lower priority, stricter threshold)
        else if (similarityScore(queryLower, term) >= 0.75) {
          suggestions.set(term, (suggestions.get(term) || 0) + 2);
        }
      }
    });
  });
  
  // Add synonym suggestions only for exact prefix matches
  expandWithSynonyms(query).forEach(syn => {
    if (syn !== queryLower && syn.startsWith(queryLower)) {
      suggestions.set(syn, (suggestions.get(syn) || 0) + 3);
    }
  });
  
  // Sort by score and return top suggestions
  return Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSuggestions)
    .map(([term]) => term);
}

/**
 * Highlight matched terms in text
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const terms = tokenize(query);
  let result = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`\\b(${term})\\b`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  
  return result;
}
