
# Fix: Enforce Category Restrictions on Collection Pages

## Problem Summary
The Music & Audio collection page is displaying video content because the category restriction system (`collectionCategoryRestrictions`) exists in the code but is **never applied** during filtering.

## Root Cause
The `filterProductsForCollection` function ignores the `collectionCategoryRestrictions` configuration that specifies `music: ['audio']`. Videos with music-related keywords (like "soundtrack", "ambient") pass the keyword matching but should be excluded based on their file type.

## Solution

### Phase 1: Enforce Category Restrictions in Collection Matcher

**File: `src/utils/collectionMatcher.ts`**

1. Add file type to category mapping utility:
```text
const fileTypeToCategory = (fileType: string | null): string | null => {
  if (!fileType) return null;
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('image/')) return 'photo';
  if (fileType.includes('svg') || fileType.includes('vector')) return 'vector';
  return null;
};
```

2. Update `filterProductsForCollection` to check category restrictions:
   - Get the allowed categories for the collection
   - For each product, determine its category from `file_type`
   - Skip products whose category is not in the allowed list

### Phase 2: Optimize Database Query (Performance)

**File: `src/pages/CollectionDetail.tsx`**

For the Music collection specifically, add a pre-filter in the database query to only fetch audio files, reducing unnecessary data transfer.

## Technical Details

### Modified `filterProductsForCollection` Logic
```text
export function filterProductsForCollection(
  products: ContentSubmission[],
  collection: SEOCollection,
  minConfidence: number = 15
): ScoredProduct[] {
  const scored: ScoredProduct[] = [];
  
  // Get category restrictions for this collection
  const allowedCategories = collectionCategoryRestrictions[collection.id];
  
  for (const product of products) {
    if (!product.slug) continue;
    
    // NEW: Check category restriction
    if (allowedCategories !== null) {
      const primaryFile = product.content_files?.[0];
      const productCategory = fileTypeToCategory(primaryFile?.file_type || null);
      
      if (productCategory && !allowedCategories.includes(productCategory)) {
        continue; // Skip - wrong category for this collection
      }
    }
    
    const { score, reasons } = calculateConfidenceScore(product, collection);
    
    if (score >= minConfidence) {
      // ... add to scored list
    }
  }
  
  return scored.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
```

### Files to Modify
1. `src/utils/collectionMatcher.ts` - Add category enforcement
2. `src/pages/CollectionDetail.tsx` - (Optional) Optimize query for audio-only collections

## Expected Outcome
- Music & Audio collection shows ONLY audio files (MP3s)
- Other collections continue to work as expected (nature = photo/video, technology = photo/video/vector, etc.)
- No videos will appear in the Music collection regardless of their title/tags

## Scope
- Low risk - isolated change to collection filtering
- No impact on marketplace or product pages
- Reuses existing `collectionCategoryRestrictions` configuration
