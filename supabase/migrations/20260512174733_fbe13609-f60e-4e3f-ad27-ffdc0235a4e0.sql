
-- 1. Tighten allowed MIME types on the `previews` bucket — MP4 only for videos.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4','image/jpeg','image/png','image/webp']::text[]
WHERE id = 'previews';

-- 2. Enforce that any non-null preview_path on a video content_file ends with .mp4
CREATE OR REPLACE FUNCTION public.enforce_video_preview_is_mp4()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.preview_path IS NOT NULL
     AND (NEW.file_type = 'video' OR NEW.file_format ILIKE 'video/%')
     AND NEW.preview_path !~* '\.mp4(\?|$)'
  THEN
    RAISE EXCEPTION 'Video preview_path must be an MP4 file (got: %)', NEW.preview_path;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_video_preview_is_mp4 ON public.content_files;
CREATE TRIGGER trg_enforce_video_preview_is_mp4
BEFORE INSERT OR UPDATE OF preview_path, file_type, file_format ON public.content_files
FOR EACH ROW
EXECUTE FUNCTION public.enforce_video_preview_is_mp4();
