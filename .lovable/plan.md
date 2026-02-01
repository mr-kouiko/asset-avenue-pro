

# Clean Up Fake Orphaned Products

## Summary
Remove all 518 "recovered" draft submissions that are actually duplicates of already-published products. These were incorrectly created because the original recovery migration didn't check if files already existed in `content_files`.

## What Will Be Deleted
- **~518 content_submissions** with description containing "automatically recovered from an orphaned upload"
- **~518 uploaded_files** linked to those drafts
- **Zero data loss**: All actual content is safely stored in `content_files` for approved products

## Database Migration

```sql
-- Step 1: Delete uploaded_files that are duplicates of approved content
-- (where the file_url matches an approved content_files.file_path for the same seller)
DELETE FROM uploaded_files
WHERE id IN (
  SELECT uf.id
  FROM uploaded_files uf
  JOIN content_submissions cs ON cs.id = uf.draft_id
  JOIN content_files cf ON cf.file_path = uf.file_url
  JOIN content_submissions approved ON approved.id = cf.submission_id
  WHERE cs.description ILIKE '%automatically recovered from an orphaned upload%'
    AND cs.status IN ('draft', 'pending')
    AND approved.status = 'approved'
    AND approved.creator_id = cs.creator_id
);

-- Step 2: Delete recovered draft submissions that now have no files
DELETE FROM content_submissions
WHERE description ILIKE '%automatically recovered from an orphaned upload%'
  AND status IN ('draft', 'pending')
  AND NOT EXISTS (
    SELECT 1 FROM uploaded_files uf WHERE uf.draft_id = content_submissions.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM content_files cf WHERE cf.submission_id = content_submissions.id
  );

-- Step 3: Also clean up any "Recovered Uploads" title drafts with no files
DELETE FROM content_submissions
WHERE title = 'Recovered Uploads'
  AND status IN ('draft', 'pending')
  AND NOT EXISTS (
    SELECT 1 FROM uploaded_files uf WHERE uf.draft_id = content_submissions.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM content_files cf WHERE cf.submission_id = content_submissions.id
  );
```

## Safety Checks Built In
1. **URL-based matching**: Only deletes `uploaded_files` where the exact URL already exists in `content_files`
2. **Same-seller verification**: Confirms the approved product belongs to the same creator
3. **Case-insensitive search**: Uses `ILIKE` to catch all variations of "automatically recovered"
4. **Orphan check**: Only deletes submissions that have no remaining files

## Expected Result
- Seller `lechheb.karim@hotmail.com`: 493 → 0 fake drafts
- All other affected sellers: cleaned up
- "Draft(s) with pending files" banner: will show accurate count (likely 0)
- Published marketplace products: **unchanged and safe**

## Verification After Migration
```sql
-- Should return 0
SELECT COUNT(*) FROM content_submissions 
WHERE description ILIKE '%automatically recovered from an orphaned upload%'
  AND status IN ('draft', 'pending');
```

