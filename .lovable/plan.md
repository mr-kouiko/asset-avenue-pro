

# Fix Marketplace Sorting and Fake Engagement Stats

## Problem Identified

Two issues are causing the marketplace sorting to appear broken:

1. **Fake random engagement stats**: The `useMarketplace` hook generates random `likes` and `downloads` values on every load:
   ```
   likes: Math.floor(Math.random() * 2000)
   downloads: Math.floor(Math.random() * 1000)
   ```
   This means every page load shows different numbers, making the UI feel unreliable and confusing.

2. **"Most popular" sort uses random data**: The default sort (`popular`) ranks by `downloads + likes`, which are random -- so the order is essentially random and changes on every refresh.

3. **Default sort should be "Most recent"**: For a marketplace with a growing catalog, defaulting to "Most recent" ensures new content gets visibility and the order is consistent.

## Solution

### 1. Replace fake stats with real database counts

- Query actual `content_likes` counts using the existing `get_content_likes_count` RPC function (already in the database)
- Query actual `downloads` count from the `downloads` table
- Cache these values to avoid excessive queries

### 2. Change default sort to "Most recent"

- Update the initial `sortBy` state from `"popular"` to `"recent"` in `Marketplace.tsx`

### 3. Batch-fetch real engagement data

- After fetching marketplace content, run a single efficient query to get like counts and download counts for all displayed items
- This avoids N+1 query problems

---

## Technical Details

### File: `src/hooks/useMarketplace.tsx`

**Remove random stats generation:**
- Replace `likes: Math.floor(Math.random() * 2000)` with real like counts from a batch query
- Replace `downloads: Math.floor(Math.random() * 1000)` with real download counts from a batch query

**Add batch engagement query:**
After fetching content submissions and files, run two parallel queries:
- `SELECT submission_id, COUNT(*) FROM content_likes WHERE submission_id = ANY($ids) GROUP BY submission_id`
- `SELECT submission_id, COUNT(*) FROM downloads WHERE submission_id = ANY($ids) GROUP BY submission_id`

Map these counts back to each content item.

### File: `src/pages/Marketplace.tsx`

**Change default sort:**
- Line 54: Change `useState("popular")` to `useState("recent")`

This ensures new visitors see the freshest content first, and sorting is always deterministic and accurate.

