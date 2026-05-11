-- Reset broken preview for elephantrock product so backfill regenerates it
UPDATE content_files
SET preview_path = NULL,
    preview_status = NULL,
    preview_failure_reason = NULL,
    preview_last_error = NULL,
    preview_attempts = 0
WHERE id = 'c3a92b3c-816b-4237-9148-1c2426c70a7a';

-- Force submission back to processing_preview until backfill regenerates a valid preview
UPDATE content_submissions
SET status = 'processing_preview'
WHERE id = '1f991717-0d05-43e4-a33b-4f53a96fee69';