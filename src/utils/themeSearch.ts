/**
 * Semantic Theme Search Engine
 * Ensures products shown for calendar themes are ONLY those
 * clearly and directly related to the theme's core intent.
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  // Core intent keywords - product MUST match at least one
  coreKeywords: string[];
  // Strong semantic keywords - boost relevance
  semanticKeywords: string[];
  // Excluded concepts - products matching these are NOT shown
  excludedConcepts: string[];
  // Required context - at least one context should match
  requiredContexts: string[];
}

/**
 * Comprehensive theme definitions with semantic expansions
 */
export const themeDefinitions: Record<string, ThemeDefinition> = {
  // Valentine's Day
  'valentine': {
    id: 'valentine',
    name: "Valentine's Day",
    coreKeywords: [
      'valentine', 'love', 'romantic', 'romance', 'heart', 'hearts',
      'couple', 'couples', 'dating', 'affection', 'kiss', 'kissing'
    ],
    semanticKeywords: [
      'passion', 'intimacy', 'sensual', 'wedding', 'anniversary',
      'relationship', 'girlfriend', 'boyfriend', 'partner', 'sweetheart',
      'cupid', 'rose', 'roses', 'red', 'pink', 'chocolate', 'gift',
      'romantic dinner', 'candlelight', 'engagement', 'proposal',
      'i love you', 'beloved', 'devotion', 'together', 'embrace', 'hug'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'gym', 'workout', 'money', 
      'finance', 'technology', 'computer', 'office', 'sport', 'game',
      'food', 'cooking', 'recipe', 'travel', 'tourism', 'city', 'urban'
    ],
    requiredContexts: ['love', 'romantic', 'couple', 'heart', 'valentine', 'passion', 'relationship']
  },

  // Christmas
  'christmas': {
    id: 'christmas',
    name: 'Christmas',
    coreKeywords: [
      'christmas', 'xmas', 'noel', 'santa', 'claus', 'reindeer',
      'tree', 'ornament', 'decoration', 'festive', 'holiday'
    ],
    semanticKeywords: [
      'gift', 'present', 'wreath', 'bells', 'jingle', 'snow', 'winter',
      'fireplace', 'stocking', 'candy cane', 'gingerbread', 'elf',
      'north pole', 'sleigh', 'mistletoe', 'carol', 'nativity', 'merry',
      'red', 'green', 'gold', 'sparkle', 'lights', 'december', 'cozy'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'gym', 'technology',
      'summer', 'beach', 'tropical', 'desert'
    ],
    requiredContexts: ['christmas', 'holiday', 'festive', 'santa', 'winter', 'gift', 'tree']
  },

  // Halloween
  'halloween': {
    id: 'halloween',
    name: 'Halloween',
    coreKeywords: [
      'halloween', 'spooky', 'scary', 'pumpkin', 'ghost', 'witch',
      'monster', 'horror', 'haunted', 'costume'
    ],
    semanticKeywords: [
      'trick', 'treat', 'skeleton', 'skull', 'zombie', 'vampire',
      'bat', 'spider', 'cobweb', 'creepy', 'dark', 'night', 'october',
      'jack-o-lantern', 'lantern', 'mask', 'disguise', 'frightening',
      'eerie', 'supernatural', 'candy', 'cemetery', 'graveyard', 'moon'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'technology', 'office',
      'summer', 'beach', 'tropical', 'romantic', 'love'
    ],
    requiredContexts: ['halloween', 'spooky', 'scary', 'pumpkin', 'ghost', 'horror', 'costume']
  },

  // Easter
  'easter': {
    id: 'easter',
    name: 'Easter',
    coreKeywords: [
      'easter', 'egg', 'eggs', 'bunny', 'rabbit', 'spring',
      'resurrection', 'christian', 'pastel'
    ],
    semanticKeywords: [
      'hunt', 'basket', 'chick', 'lamb', 'lily', 'cross', 'church',
      'sunday', 'celebration', 'family', 'tradition', 'chocolate',
      'colorful', 'decoration', 'flowers', 'bloom', 'renewal', 'hope',
      'april', 'march', 'faith', 'religious'
    ],
    excludedConcepts: [
      'business', 'corporate', 'technology', 'office', 'fitness',
      'halloween', 'spooky', 'christmas', 'summer', 'beach'
    ],
    requiredContexts: ['easter', 'egg', 'bunny', 'spring', 'pastel', 'rabbit']
  },

  // New Year
  'new year': {
    id: 'new-year',
    name: 'New Year',
    coreKeywords: [
      'new year', 'newyear', 'year', 'countdown', 'midnight',
      'fireworks', 'celebration', 'party', 'champagne'
    ],
    semanticKeywords: [
      'january', 'eve', 'clock', 'toast', 'resolution', 'confetti',
      'sparkle', 'glitter', 'gold', 'silver', 'ball drop', 'cheers',
      'beginning', 'fresh start', 'festive', 'joy', 'excitement',
      'dance', 'music', 'celebrate', '2025', '2026'
    ],
    excludedConcepts: [
      'business', 'corporate', 'technology', 'office', 'fitness',
      'summer', 'beach', 'tropical', 'work'
    ],
    requiredContexts: ['year', 'celebration', 'party', 'fireworks', 'midnight', 'champagne']
  },

  // Mother's Day
  'mother': {
    id: 'mother',
    name: "Mother's Day",
    coreKeywords: [
      'mother', 'mom', 'mommy', 'mama', 'mum', 'maternal',
      'motherhood', 'family'
    ],
    semanticKeywords: [
      'daughter', 'son', 'children', 'kid', 'baby', 'love', 'care',
      'nurture', 'hug', 'embrace', 'flower', 'bouquet', 'gift',
      'appreciation', 'thank', 'gratitude', 'parent', 'woman',
      'generation', 'bond', 'together', 'happy', 'smile'
    ],
    excludedConcepts: [
      'business', 'corporate', 'technology', 'office', 'fitness',
      'gym', 'sport', 'halloween', 'spooky'
    ],
    requiredContexts: ['mother', 'mom', 'family', 'parent', 'children', 'love', 'care']
  },

  // Father's Day
  'father': {
    id: 'father',
    name: "Father's Day",
    coreKeywords: [
      'father', 'dad', 'daddy', 'papa', 'paternal', 'fatherhood'
    ],
    semanticKeywords: [
      'son', 'daughter', 'children', 'kid', 'family', 'love', 'care',
      'teach', 'mentor', 'guide', 'gift', 'appreciation', 'thank',
      'gratitude', 'parent', 'man', 'generation', 'bond', 'together',
      'happy', 'smile', 'outdoor', 'sport', 'play'
    ],
    excludedConcepts: [
      'business', 'corporate', 'technology', 'office',
      'halloween', 'spooky', 'romantic', 'couple'
    ],
    requiredContexts: ['father', 'dad', 'family', 'parent', 'children']
  },

  // Thanksgiving
  'thanksgiving': {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    coreKeywords: [
      'thanksgiving', 'turkey', 'harvest', 'gratitude', 'thankful',
      'feast', 'dinner', 'autumn', 'fall'
    ],
    semanticKeywords: [
      'family', 'gathering', 'table', 'meal', 'pumpkin', 'pie',
      'cornucopia', 'pilgrim', 'november', 'tradition', 'blessing',
      'grateful', 'abundance', 'corn', 'leaves', 'orange', 'brown',
      'cozy', 'home', 'together', 'celebration'
    ],
    excludedConcepts: [
      'business', 'corporate', 'technology', 'fitness', 'gym',
      'summer', 'beach', 'tropical', 'christmas', 'halloween'
    ],
    requiredContexts: ['thanksgiving', 'turkey', 'harvest', 'fall', 'autumn', 'family', 'dinner']
  },

  // Summer
  'summer': {
    id: 'summer',
    name: 'Summer',
    coreKeywords: [
      'summer', 'beach', 'sun', 'sunny', 'vacation', 'holiday',
      'pool', 'swimming', 'ocean', 'sea'
    ],
    semanticKeywords: [
      'tropical', 'hot', 'warm', 'sand', 'wave', 'surf', 'tan',
      'sunglasses', 'sunscreen', 'bikini', 'swimsuit', 'ice cream',
      'barbecue', 'bbq', 'outdoor', 'picnic', 'festival', 'fun',
      'relax', 'travel', 'resort', 'paradise', 'island', 'palm'
    ],
    excludedConcepts: [
      'business', 'corporate', 'office', 'snow', 'winter', 'cold',
      'christmas', 'halloween', 'autumn', 'fall'
    ],
    requiredContexts: ['summer', 'beach', 'sun', 'vacation', 'pool', 'ocean', 'tropical']
  },

  // Winter
  'winter': {
    id: 'winter',
    name: 'Winter',
    coreKeywords: [
      'winter', 'snow', 'cold', 'ice', 'frost', 'frozen',
      'snowflake', 'skiing', 'cozy'
    ],
    semanticKeywords: [
      'december', 'january', 'february', 'white', 'snowy', 'blizzard',
      'fireplace', 'warm', 'blanket', 'hot chocolate', 'sweater',
      'mittens', 'scarf', 'snowman', 'mountain', 'cabin', 'lodge',
      'icy', 'cool', 'chilly', 'wonderland'
    ],
    excludedConcepts: [
      'business', 'corporate', 'office', 'summer', 'beach', 'tropical',
      'hot', 'desert', 'gym', 'fitness'
    ],
    requiredContexts: ['winter', 'snow', 'cold', 'ice', 'frost', 'cozy']
  },

  // Spring
  'spring': {
    id: 'spring',
    name: 'Spring',
    coreKeywords: [
      'spring', 'bloom', 'blossom', 'flower', 'flowers', 'garden',
      'nature', 'fresh', 'renewal'
    ],
    semanticKeywords: [
      'march', 'april', 'may', 'green', 'grass', 'rain', 'rainbow',
      'butterfly', 'bee', 'bird', 'nest', 'petal', 'tulip', 'daisy',
      'cherry blossom', 'park', 'outdoor', 'awakening', 'growth',
      'new life', 'pastel', 'colorful', 'sunny'
    ],
    excludedConcepts: [
      'business', 'corporate', 'office', 'winter', 'snow', 'cold',
      'halloween', 'christmas', 'autumn', 'fall'
    ],
    requiredContexts: ['spring', 'flower', 'bloom', 'garden', 'nature', 'fresh']
  },

  // Autumn/Fall
  'autumn': {
    id: 'autumn',
    name: 'Autumn',
    coreKeywords: [
      'autumn', 'fall', 'leaves', 'harvest', 'october', 'november',
      'foliage', 'golden', 'orange'
    ],
    semanticKeywords: [
      'september', 'pumpkin', 'apple', 'cider', 'cozy', 'warm',
      'sweater', 'forest', 'woods', 'tree', 'brown', 'red', 'yellow',
      'rustic', 'country', 'farm', 'maple', 'acorn', 'squirrel',
      'fog', 'mist', 'harvest moon'
    ],
    excludedConcepts: [
      'business', 'corporate', 'office', 'summer', 'beach', 'tropical',
      'spring', 'winter', 'snow', 'gym', 'fitness'
    ],
    requiredContexts: ['autumn', 'fall', 'leaves', 'harvest', 'orange', 'golden']
  },

  // Pride Month
  'pride': {
    id: 'pride',
    name: 'Pride Month',
    coreKeywords: [
      'pride', 'rainbow', 'lgbtq', 'lgbt', 'gay', 'lesbian',
      'queer', 'diversity', 'inclusion', 'equality'
    ],
    semanticKeywords: [
      'love is love', 'bisexual', 'transgender', 'nonbinary', 'parade',
      'celebration', 'community', 'flag', 'colorful', 'acceptance',
      'rights', 'freedom', 'identity', 'expression', 'june', 'ally',
      'progress', 'unity', 'support'
    ],
    excludedConcepts: [
      'business', 'corporate', 'office', 'technology', 'fitness',
      'halloween', 'christmas', 'winter', 'snow'
    ],
    requiredContexts: ['pride', 'rainbow', 'lgbtq', 'diversity', 'equality', 'love']
  },

  // Black Friday
  'black friday': {
    id: 'black-friday',
    name: 'Black Friday',
    coreKeywords: [
      'sale', 'discount', 'shopping', 'deal', 'promotion',
      'black friday', 'offer', 'price'
    ],
    semanticKeywords: [
      'store', 'retail', 'buy', 'purchase', 'bargain', 'savings',
      'percent off', 'limited', 'exclusive', 'special', 'november',
      'friday', 'cyber', 'online', 'cart', 'checkout', 'coupon',
      'flash sale', 'clearance', 'doorbusters'
    ],
    excludedConcepts: [
      'nature', 'landscape', 'beach', 'vacation', 'romantic', 'love',
      'fitness', 'gym', 'workout', 'travel'
    ],
    requiredContexts: ['sale', 'shopping', 'deal', 'discount', 'black friday', 'promotion']
  },

  // Ramadan
  'ramadan': {
    id: 'ramadan',
    name: 'Ramadan',
    coreKeywords: [
      'ramadan', 'islamic', 'muslim', 'mosque', 'prayer', 'fasting',
      'eid', 'iftar', 'moon', 'crescent'
    ],
    semanticKeywords: [
      'lantern', 'arabic', 'quran', 'faith', 'spiritual', 'holy',
      'blessed', 'family', 'community', 'tradition', 'dates', 'food',
      'breaking fast', 'suhoor', 'mubarak', 'kareem', 'middle east',
      'calligraphy', 'ornament', 'night', 'star'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'gym', 'alcohol', 'wine',
      'christmas', 'easter', 'halloween', 'pork'
    ],
    requiredContexts: ['ramadan', 'islamic', 'muslim', 'prayer', 'mosque', 'eid', 'moon']
  },

  // Diwali
  'diwali': {
    id: 'diwali',
    name: 'Diwali',
    coreKeywords: [
      'diwali', 'deepavali', 'festival', 'lights', 'hindu', 'indian',
      'lamp', 'diya', 'candle'
    ],
    semanticKeywords: [
      'rangoli', 'fireworks', 'celebration', 'tradition', 'family',
      'sweets', 'gold', 'colorful', 'bright', 'india', 'goddess',
      'lakshmi', 'ganesh', 'puja', 'prayer', 'prosperity', 'fortune',
      'henna', 'sari', 'jewelry', 'sparkle'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'gym', 'christmas',
      'halloween', 'winter', 'snow', 'beach', 'summer'
    ],
    requiredContexts: ['diwali', 'lights', 'festival', 'indian', 'hindu', 'lamp', 'celebration']
  },

  // Chinese New Year
  'chinese new year': {
    id: 'chinese-new-year',
    name: 'Chinese New Year',
    coreKeywords: [
      'chinese', 'lunar', 'dragon', 'zodiac', 'red', 'lantern',
      'spring festival', 'new year'
    ],
    semanticKeywords: [
      'china', 'tradition', 'celebration', 'fireworks', 'family',
      'reunion', 'envelope', 'gold', 'fortune', 'luck', 'prosperity',
      'lion dance', 'temple', 'dumpling', 'feast', 'asia', 'asian',
      'decoration', 'ornament', 'snake', 'tiger', 'rabbit', 'ox'
    ],
    excludedConcepts: [
      'business', 'corporate', 'fitness', 'gym', 'christmas',
      'halloween', 'summer', 'beach', 'tropical'
    ],
    requiredContexts: ['chinese', 'lunar', 'dragon', 'lantern', 'red', 'asia', 'zodiac']
  }
};

/**
 * Find the best matching theme definition for a search query
 */
export function findThemeForQuery(query: string): ThemeDefinition | null {
  const queryLower = query.toLowerCase();
  
  // Check each theme definition
  for (const [key, theme] of Object.entries(themeDefinitions)) {
    // Check if query contains the theme key or any core keyword
    if (queryLower.includes(key) || 
        theme.coreKeywords.some(kw => queryLower.includes(kw))) {
      return theme;
    }
  }
  
  return null;
}

/**
 * Semantic Theme Search - Strict relevance matching
 */
export interface ThemeSearchResult<T> {
  item: T;
  score: number;
  matchedKeywords: string[];
  matchType: 'core' | 'semantic' | 'contextual';
  excluded: boolean;
}

interface SearchableItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  type?: string;
}

/**
 * Check if content matches theme with strict semantic filtering
 */
export function matchesTheme<T extends SearchableItem>(
  item: T,
  theme: ThemeDefinition
): ThemeSearchResult<T> | null {
  const titleLower = (item.title || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();
  const tagsLower = (item.tags || []).map(t => t.toLowerCase());
  const allText = `${titleLower} ${descLower} ${tagsLower.join(' ')}`;
  
  // STEP 1: Check for exclusions FIRST
  const hasExcludedConcept = theme.excludedConcepts.some(excluded => {
    // Check if the excluded concept appears prominently
    return titleLower.includes(excluded) || 
           tagsLower.some(tag => tag.includes(excluded));
  });
  
  if (hasExcludedConcept) {
    // Don't immediately exclude - check if core context overrides
    const hasCoreMatch = theme.coreKeywords.some(kw => 
      titleLower.includes(kw) || tagsLower.some(tag => tag.includes(kw))
    );
    if (!hasCoreMatch) {
      return null; // Excluded without core match
    }
  }
  
  // STEP 2: Check for CORE keyword matches (required)
  const matchedCore: string[] = [];
  for (const keyword of theme.coreKeywords) {
    if (titleLower.includes(keyword)) {
      matchedCore.push(keyword);
    } else if (tagsLower.some(tag => tag.includes(keyword))) {
      matchedCore.push(keyword);
    } else if (descLower.includes(keyword)) {
      matchedCore.push(keyword);
    }
  }
  
  // STEP 3: Check for SEMANTIC keyword matches (boost)
  const matchedSemantic: string[] = [];
  for (const keyword of theme.semanticKeywords) {
    if (allText.includes(keyword)) {
      matchedSemantic.push(keyword);
    }
  }
  
  // STEP 4: Check required contexts
  const hasRequiredContext = theme.requiredContexts.some(context => 
    allText.includes(context)
  );
  
  // STEP 5: Calculate relevance
  // STRICT RULE: Must match at least one core keyword OR have strong semantic + context
  if (matchedCore.length === 0) {
    // Allow if has 2+ semantic matches AND required context
    if (matchedSemantic.length >= 2 && hasRequiredContext) {
      // This is a contextual match - lower priority
      return {
        item,
        score: matchedSemantic.length * 20,
        matchedKeywords: matchedSemantic,
        matchType: 'contextual',
        excluded: false
      };
    }
    return null; // Not relevant enough
  }
  
  // Calculate score
  let score = 0;
  
  // Core matches in title = highest value
  for (const kw of matchedCore) {
    if (titleLower.includes(kw)) {
      score += 100;
    } else if (tagsLower.some(tag => tag.includes(kw))) {
      score += 80;
    } else {
      score += 40;
    }
  }
  
  // Semantic matches add bonus
  score += matchedSemantic.length * 15;
  
  // Multiple core matches = strong signal
  if (matchedCore.length >= 2) {
    score *= 1.3;
  }
  
  // Required context boost
  if (hasRequiredContext) {
    score *= 1.1;
  }
  
  return {
    item,
    score,
    matchedKeywords: [...matchedCore, ...matchedSemantic],
    matchType: matchedCore.length >= 2 ? 'core' : 'semantic',
    excluded: false
  };
}

/**
 * Perform theme-based semantic search
 * Returns ONLY products clearly relevant to the theme
 */
export function themeSearch<T extends SearchableItem>(
  items: T[],
  query: string,
  maxResults: number = 100
): ThemeSearchResult<T>[] {
  const theme = findThemeForQuery(query);
  
  // If no theme detected, fall back to regular search
  if (!theme) {
    return [];
  }
  
  const results: ThemeSearchResult<T>[] = [];
  
  for (const item of items) {
    const result = matchesTheme(item, theme);
    if (result) {
      results.push(result);
    }
  }
  
  // Sort by: match type priority, then score
  results.sort((a, b) => {
    const typePriority = { core: 3, semantic: 2, contextual: 1 };
    const typeDiff = typePriority[b.matchType] - typePriority[a.matchType];
    if (typeDiff !== 0) return typeDiff;
    return b.score - a.score;
  });
  
  return results.slice(0, maxResults);
}

/**
 * Check if a query should use theme search
 */
export function shouldUseThemeSearch(query: string): boolean {
  return findThemeForQuery(query) !== null;
}

/**
 * Get the expanded search query for a theme
 * This returns all relevant keywords to search for
 */
export function getThemeSearchQuery(themeQuery: string): string[] {
  const theme = findThemeForQuery(themeQuery);
  if (!theme) {
    return themeQuery.split(/\s+/);
  }
  
  // Return core + top semantic keywords for the search
  return [...theme.coreKeywords, ...theme.semanticKeywords.slice(0, 10)];
}
