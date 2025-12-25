/**
 * Advanced Fuzzy Search Utilities
 * Handles typos, synonyms, partial matches, and relevance scoring
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
 * Calculate relevance score for a content item
 */
export interface SearchableContent {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  author?: string;
  type?: string;
  price?: number;
  downloads?: number;
  likes?: number;
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  matchedTerms: string[];
}

export function calculateRelevanceScore(
  content: SearchableContent,
  searchTerms: string[],
  expandedTerms: string[]
): ScoredResult<SearchableContent> | null {
  let score = 0;
  const matchedTerms: string[] = [];
  
  const titleTokens = tokenize(content.title || '');
  const descTokens = tokenize(content.description || '');
  const tagTokens = (content.tags || []).flatMap(tag => tokenize(tag));
  const authorTokens = tokenize(content.author || '');
  const typeTokens = tokenize(content.type || '');
  
  const allTokens = [...titleTokens, ...descTokens, ...tagTokens, ...authorTokens, ...typeTokens];
  
  // Check each search term
  for (const term of searchTerms) {
    let termMatched = false;
    
    // Exact title match (highest score)
    if (titleTokens.includes(term)) {
      score += 100;
      termMatched = true;
    } else {
      // Fuzzy title match
      for (const titleWord of titleTokens) {
        const sim = similarityScore(term, titleWord);
        if (sim >= 0.7) {
          score += 80 * sim;
          termMatched = true;
          break;
        }
        // Partial match (word starts with term)
        if (titleWord.startsWith(term) || term.startsWith(titleWord)) {
          score += 60;
          termMatched = true;
          break;
        }
      }
    }
    
    // Tag match (high score)
    if (tagTokens.includes(term)) {
      score += 70;
      termMatched = true;
    } else {
      for (const tagWord of tagTokens) {
        const sim = similarityScore(term, tagWord);
        if (sim >= 0.7) {
          score += 50 * sim;
          termMatched = true;
          break;
        }
      }
    }
    
    // Type match
    if (typeTokens.includes(term)) {
      score += 40;
      termMatched = true;
    }
    
    // Author match
    if (authorTokens.includes(term)) {
      score += 30;
      termMatched = true;
    }
    
    // Description match (lower score)
    if (descTokens.includes(term)) {
      score += 20;
      termMatched = true;
    } else {
      for (const descWord of descTokens) {
        if (descWord.startsWith(term) || term.startsWith(descWord)) {
          score += 10;
          termMatched = true;
          break;
        }
      }
    }
    
    if (termMatched) {
      matchedTerms.push(term);
    }
  }
  
  // Bonus for synonym matches
  for (const expandedTerm of expandedTerms) {
    if (!searchTerms.includes(expandedTerm)) {
      if (allTokens.some(token => areSynonyms(token, expandedTerm))) {
        score += 15;
      }
    }
  }
  
  // Popularity boost (small factor)
  const popularityBoost = Math.log10(1 + (content.downloads || 0) + (content.likes || 0)) * 2;
  score += popularityBoost;
  
  // Return null if no matches
  if (matchedTerms.length === 0 && score < 5) {
    return null;
  }
  
  return {
    item: content,
    score,
    matchedTerms
  };
}

/**
 * Perform fuzzy search with relevance ranking
 */
export function fuzzySearch<T extends SearchableContent>(
  items: T[],
  query: string,
  options: {
    minScore?: number;
    maxResults?: number;
  } = {}
): ScoredResult<T>[] {
  const { minScore = 5, maxResults = 100 } = options;
  
  if (!query.trim()) {
    return items.map(item => ({ item, score: 0, matchedTerms: [] }));
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
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
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
      item.type?.toLowerCase()
    ].filter(Boolean) as string[];
    
    allTerms.forEach(term => {
      if (term.length >= 2) {
        // Starts with query (highest priority)
        if (term.startsWith(queryLower)) {
          suggestions.set(term, (suggestions.get(term) || 0) + 10);
        }
        // Contains query
        else if (term.includes(queryLower)) {
          suggestions.set(term, (suggestions.get(term) || 0) + 5);
        }
        // Fuzzy match
        else if (similarityScore(queryLower, term) >= 0.6) {
          suggestions.set(term, (suggestions.get(term) || 0) + 3);
        }
      }
    });
  });
  
  // Add synonym suggestions
  expandWithSynonyms(query).forEach(syn => {
    if (syn !== queryLower && syn.startsWith(queryLower)) {
      suggestions.set(syn, (suggestions.get(syn) || 0) + 4);
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
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  
  return result;
}
