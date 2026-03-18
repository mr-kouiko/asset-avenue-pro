-- Harden get_product_files: NEVER return file_path for original files
CREATE OR REPLACE FUNCTION public.get_product_files(content_id uuid)
 RETURNS TABLE(id uuid, submission_id uuid, file_name text, file_path text, file_type text, file_format text, file_size bigint, thumbnail_path text, preview_path text, is_original boolean, is_preview boolean, metadata jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    cf.id,
    cf.submission_id,
    cf.file_name,
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
    CASE 
      WHEN cf.is_original = true THEN 
        (cf.metadata - 'bucket' - 'storagePath' - 'originalPath' - 'signedUrl')
      ELSE cf.metadata
    END as metadata,
    cf.created_at
  FROM content_files cf
  JOIN content_submissions cs ON cs.id = cf.submission_id
  WHERE cf.submission_id = content_id
  AND cs.status = 'approved';
$function$;