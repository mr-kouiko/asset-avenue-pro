-- Create a SECURITY DEFINER function to get product files for approved content
-- This bypasses RLS policies and ensures public access to approved product files
CREATE OR REPLACE FUNCTION public.get_product_files(content_id uuid)
RETURNS TABLE(
  id uuid,
  submission_id uuid,
  file_name text,
  file_path text,
  file_type text,
  file_format text,
  file_size bigint,
  thumbnail_path text,
  preview_path text,
  is_original boolean,
  is_preview boolean,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cf.id,
    cf.submission_id,
    cf.file_name,
    cf.file_path,
    cf.file_type,
    cf.file_format,
    cf.file_size,
    cf.thumbnail_path,
    cf.preview_path,
    cf.is_original,
    cf.is_preview,
    cf.metadata,
    cf.created_at
  FROM content_files cf
  JOIN content_submissions cs ON cs.id = cf.submission_id
  WHERE cf.submission_id = content_id
  AND cs.status = 'approved';
$$;