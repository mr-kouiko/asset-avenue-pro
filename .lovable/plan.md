
# Plan: Make Collections Visible to Marketplace Visitors

## Overview
The 10 thematic collections (Business, Technology, Nature, Travel, etc.) currently exist only as static SEO pages (`/s/collections/:slug`) but are completely invisible to visitors browsing the React app. This plan adds multiple discovery points for collections throughout the frontend.

## Technical Details

### 1. Add Collections Section to Homepage
**File:** `src/pages/en/IndexEN.tsx`

Add a new "Explore Collections" section between the "Explore by Category" and "Why Choose VisuStock?" sections:
- Grid layout showing all 10 collection cards
- Each card links to `/s/collections/:slug`
- Visual icons or subtle styling to differentiate from categories
- Imported from the shared `seoCollections` data

### 2. Create Reusable Collections Grid Component
**File:** `src/components/CollectionsGrid.tsx` (new)

A reusable component that displays collection cards:
- Imports `seoCollections` from `src/data/seoCollections.ts`
- Configurable number of items to display
- Links to `/s/collections/:slug` for each collection
- Responsive grid (2 cols mobile, 5 cols desktop)

### 3. Add Collections Tab to Homepage Tabs
**File:** `src/components/HomepageTabs.tsx`

Extend the existing tab system:
- Add a 4th "Collections" tab alongside Trending, Free Stock, Calendar
- Display curated collection cards when selected
- Use the CollectionsGrid component

### 4. Add Collections to Footer Navigation
**File:** `src/pages/en/IndexEN.tsx`

Add a "Collections" column to the footer with top collections:
- Business, Technology, Nature, Travel, Lifestyle (top 5 by priority)
- Links to `/s/collections/:slug`

### 5. Add Collections to Main Navigation
**File:** `src/components/Navigation.tsx`

Add a "Collections" link to the navigation bar:
- Single link to `/s/collections` (index page)
- Or dropdown with popular collections

### 6. Add Collections Navigation to Header (Mobile Menu)
**File:** `src/components/MobileMenu.tsx`

Add collections section to mobile menu for mobile discovery.

### 7. Create React Collections Index Page
**File:** `src/pages/Collections.tsx` (new)

A React page at `/collections` that displays all 10 collections:
- Full grid of all collection cards
- Links to static `/s/collections/:slug` pages
- SEO metadata for the index page

### 8. Update App Router
**File:** `src/App.tsx`

Add route for the new Collections index page:
```
<Route path="/collections" element={<Collections />} />
```

## Implementation Summary

```text
+------------------------+     +------------------------+
|      Homepage          |     |     Mobile Menu        |
|  - Collections Grid    |     |  - Collections Link    |
+------------------------+     +------------------------+
          |                              |
          v                              v
+------------------------+     +------------------------+
|   Navigation Bar       |     |     Footer             |
|  - Collections Link    |     |  - Top 5 Collections   |
+------------------------+     +------------------------+
          |
          v
+------------------------+
|   /collections (React) |
|   All 10 collections   |
+------------------------+
          |
          v
+------------------------+
|  /s/collections/:slug  |
|  (Static SEO pages)    |
+------------------------+
```

## Files to Create
1. `src/components/CollectionsGrid.tsx` - Reusable grid component
2. `src/pages/Collections.tsx` - React collections index page

## Files to Modify
1. `src/pages/en/IndexEN.tsx` - Add collections section + footer links
2. `src/components/HomepageTabs.tsx` - Add Collections tab
3. `src/components/Navigation.tsx` - Add Collections nav link
4. `src/components/MobileMenu.tsx` - Add Collections to mobile menu
5. `src/App.tsx` - Add /collections route

## SEO Benefits
- Creates internal links from high-traffic pages to collection hubs
- Improves crawl efficiency with clear navigation paths
- Helps resolve "Crawled – currently not indexed" by strengthening PageRank flow
- Users can now discover and navigate to collections naturally
