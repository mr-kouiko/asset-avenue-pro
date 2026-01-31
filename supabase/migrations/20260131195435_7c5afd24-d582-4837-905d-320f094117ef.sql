-- Phase 1: Clean up duplicate recovered drafts
-- Delete content_submissions where description indicates recovery AND the linked file
-- has a size matching an already-approved product (indicating it's a duplicate)

DELETE FROM content_submissions
WHERE description LIKE '%Automatically recovered%'
  AND status IN ('draft', 'pending')
  AND id IN (
    SELECT DISTINCT uf.draft_id
    FROM uploaded_files uf
    WHERE uf.draft_id IS NOT NULL
      AND uf.file_size IN (
        SELECT DISTINCT cf.file_size
        FROM content_files cf
        JOIN content_submissions csub ON csub.id = cf.submission_id
        WHERE csub.status = 'approved'
      )
  );

-- Also clean up recovered submissions with 'recovered' in title that match approved file sizes
DELETE FROM content_submissions
WHERE title LIKE '%Recovered%'
  AND status IN ('draft', 'pending')
  AND id IN (
    SELECT DISTINCT uf.draft_id
    FROM uploaded_files uf
    WHERE uf.draft_id IS NOT NULL
      AND uf.file_size IN (
        SELECT DISTINCT cf.file_size
        FROM content_files cf
        JOIN content_submissions csub ON csub.id = cf.submission_id
        WHERE csub.status = 'approved'
      )
  );