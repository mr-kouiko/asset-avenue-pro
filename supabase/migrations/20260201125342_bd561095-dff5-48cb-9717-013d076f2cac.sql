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