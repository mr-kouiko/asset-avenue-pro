-- Add file_hash column to uploaded_files table
ALTER TABLE public.uploaded_files 
ADD COLUMN IF NOT EXISTS file_hash text;

-- Add file_hash column to content_files table
ALTER TABLE public.content_files 
ADD COLUMN IF NOT EXISTS file_hash text;

-- Create unique index on file_hash for uploaded_files to enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_uploaded_files_hash 
ON public.uploaded_files(file_hash) 
WHERE file_hash IS NOT NULL;

-- Create unique index on file_hash for content_files to enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_files_hash 
ON public.content_files(file_hash) 
WHERE file_hash IS NOT NULL;

-- Create function to check for duplicate files across both tables
CREATE OR REPLACE FUNCTION public.check_file_duplicate(hash_value text)
RETURNS TABLE(
  exists_in_uploaded boolean,
  exists_in_content boolean,
  duplicate_file_name text,
  duplicate_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM uploaded_files WHERE file_hash = hash_value) as exists_in_uploaded,
    EXISTS(SELECT 1 FROM content_files WHERE file_hash = hash_value) as exists_in_content,
    COALESCE(
      (SELECT file_name FROM uploaded_files WHERE file_hash = hash_value LIMIT 1),
      (SELECT file_name FROM content_files WHERE file_hash = hash_value LIMIT 1)
    ) as duplicate_file_name,
    (SELECT user_id FROM uploaded_files WHERE file_hash = hash_value LIMIT 1) as duplicate_user_id;
END;
$$;