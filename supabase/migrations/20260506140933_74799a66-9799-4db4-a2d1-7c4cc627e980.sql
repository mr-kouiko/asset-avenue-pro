CREATE OR REPLACE FUNCTION public.get_product_original_video_url(content_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cf.file_path
  FROM content_files cf
  JOIN content_submissions cs ON cs.id = cf.submission_id
  WHERE cf.submission_id = content_id
    AND cs.status = 'approved'
    AND cf.is_original = true
    AND (cf.file_type ILIKE 'video%' OR cf.file_path ~* '\.(mp4|webm|mov|m4v)(\?|$)')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_original_video_url(uuid) TO anon, authenticated;