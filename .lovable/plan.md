
# Plan: Fix Duplicate "Recovered" Drafts Issue

## Problem Identified
The recovery migration created **528 draft submissions** from "orphaned" uploads, but analysis shows **~98% (519+) are duplicates** of already-published products. This happened because:

1. The `uploaded_files` table retains raw uploads even after successful publishing
2. Published products copy files to `content_files` with renamed (SEO-friendly) filenames
3. The original query only checked `draft_id IS NULL` without verifying if the same content already existed in `content_files`

## Solution Overview

### Phase 1: Clean Up Duplicate Recovered Drafts (Database Migration)

Delete recovered draft submissions where the linked file's size matches an already-approved product's file size (indicating same content):

```sql
-- Delete duplicate recovered drafts
DELETE FROM content_submissions
WHERE description LIKE '%recovered%'
  AND id IN (
    SELECT DISTINCT uf.draft_id
    FROM uploaded_files uf
    JOIN content_submissions cs ON cs.id = uf.draft_id
    WHERE cs.description LIKE '%recovered%'
      AND uf.file_size IN (
        SELECT DISTINCT cf.file_size
        FROM content_files cf
        JOIN content_submissions csub ON csub.id = cf.submission_id
        WHERE csub.status = 'approved'
      )
  );
```

This will cascade-delete the linked `uploaded_files` entries (via ON DELETE CASCADE).

### Phase 2: Prevent Future Orphans

Update the upload flow to properly link `uploaded_files` to their corresponding submission when publishing:

1. **File: `src/hooks/useContentManagement.tsx` or related submission hook**
   - When a submission is approved/published, update the original `uploaded_files` record to set `draft_id` to the submission ID
   - This ensures future integrity checks correctly identify processed files

2. **File: Admin approval workflow**
   - Add logic to mark `uploaded_files` entries as "processed" when their submission goes live

### Phase 3: Improve Recovery Logic

Update `useDraftManager.tsx` to exclude files that match published content:

```typescript
// In recoverOrphanedUploads():
// Add check: Exclude files whose size matches any approved content_files
const approvedFileSizes = await getApprovedFileSizes();
const trulyOrphaned = orphanedFiles.filter(f => 
  !approvedFileSizes.has(f.file_size)
);
```

## Technical Details

### Files to Modify
1. **Database Migration** (new) - Clean up duplicate drafts
2. `src/hooks/useDraftManager.tsx` - Add size-based duplicate detection
3. `src/hooks/useContentManagement.tsx` (or submit handler) - Link uploaded_files to submission on publish

### Impact
- **519+ duplicate drafts deleted** - Cleans up seller dashboards
- **~9 or fewer truly orphaned files** may remain (if any exist)
- Prevents future false-positive recoveries

### Rollback Plan
The deleted data is technically recoverable since:
- The actual files still exist in storage (content_files paths)
- The `content_submissions` for approved products remain intact
- Only the duplicate "recovered" drafts are removed

## Timeline
1. Run cleanup migration (immediate)
2. Update recovery logic (prevents recurrence)
3. Monitor for any truly orphaned uploads going forward
