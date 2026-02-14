
-- Create private bucket for original HD master files
-- This bucket has NO public access - files can only be accessed via signed URLs
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('original-files', 'original-files', false, 2147483648)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for original-files bucket
-- Only authenticated users can upload their own files
CREATE POLICY "Users can upload originals to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'original-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the file owner can read their originals (or service role)
CREATE POLICY "Users can read their own originals"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'original-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only the file owner can delete their originals
CREATE POLICY "Users can delete their own originals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'original-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update get_product_files to NEVER expose file_path for original files
-- Only return file_path for preview/thumbnail files
CREATE OR REPLACE FUNCTION public.get_product_files(content_id uuid)
 RETURNS TABLE(id uuid, submission_id uuid, file_name text, file_path text, file_type text, file_format text, file_size bigint, thumbnail_path text, preview_path text, is_original boolean, is_preview boolean, metadata jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    cf.id,
    cf.submission_id,
    cf.file_name,
    -- SECURITY: Never expose original file paths to the frontend
    -- Only preview and thumbnail paths are returned
    CASE 
      WHEN cf.is_original = true THEN ''::text
      ELSE cf.file_path
    END as file_path,
    cf.file_type,
    cf.file_format,
    cf.file_size,
    cf.thumbnail_path,
    cf.preview_path,
    cf.is_original,
    cf.is_preview,
    -- Strip sensitive metadata (bucket info, storage paths)
    CASE 
      WHEN cf.is_original = true THEN 
        (cf.metadata - 'bucket' - 'storagePath' - 'originalPath')
      ELSE cf.metadata
    END as metadata,
    cf.created_at
  FROM content_files cf
  JOIN content_submissions cs ON cs.id = cf.submission_id
  WHERE cf.submission_id = content_id
  AND cs.status = 'approved';
$function$;

-- Update get_public_file_access to also hide original paths
CREATE OR REPLACE FUNCTION public.get_public_file_access()
 RETURNS TABLE(id uuid, content_id uuid, file_name text, file_type text, file_format text, file_size bigint, metadata jsonb, is_preview boolean, has_thumbnail boolean, public_file_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        cf.id,
        cf.submission_id as content_id,
        cf.file_name,
        cf.file_type,
        cf.file_format,
        cf.file_size,
        jsonb_build_object(
            'width', cf.metadata->>'width',
            'height', cf.metadata->>'height', 
            'duration', cf.metadata->>'duration'
        ) as metadata,
        cf.is_preview,
        (cf.thumbnail_path IS NOT NULL) as has_thumbnail,
        CASE 
            WHEN cf.is_preview = true AND cf.preview_path IS NOT NULL THEN cf.preview_path
            WHEN cf.thumbnail_path IS NOT NULL THEN cf.thumbnail_path
            ELSE NULL
        END as public_file_url
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cs.status = 'approved'
    AND (cf.is_preview = true OR cf.thumbnail_path IS NOT NULL);
$function$;
