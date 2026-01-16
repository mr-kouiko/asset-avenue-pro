-- Remove the old constraint and add a new one for 2GB limit
ALTER TABLE public.content_files DROP CONSTRAINT IF EXISTS content_files_file_size_check;

-- Add new constraint: 2GB = 2,147,483,648 bytes
ALTER TABLE public.content_files ADD CONSTRAINT content_files_file_size_check CHECK (file_size >= 0 AND file_size <= 2147483648);

-- Also update uploaded_files table for consistency
ALTER TABLE public.uploaded_files DROP CONSTRAINT IF EXISTS uploaded_files_file_size_check;
ALTER TABLE public.uploaded_files ADD CONSTRAINT uploaded_files_file_size_check CHECK (file_size >= 0 AND file_size <= 2147483648);

-- Update file_uploads table as well
ALTER TABLE public.file_uploads DROP CONSTRAINT IF EXISTS file_uploads_file_size_check;
ALTER TABLE public.file_uploads ADD CONSTRAINT file_uploads_file_size_check CHECK (file_size >= 0 AND file_size <= 2147483648);