ALTER TABLE public.content_files
  ADD COLUMN IF NOT EXISTS preview_quality text;

CREATE INDEX IF NOT EXISTS idx_content_files_preview_quality_degraded
  ON public.content_files (preview_quality)
  WHERE preview_quality = 'preview_degraded';

CREATE OR REPLACE FUNCTION public.sync_preview_status_on_preview_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.preview_path IS NOT NULL AND (OLD.preview_path IS DISTINCT FROM NEW.preview_path) THEN
    NEW.preview_status := 'ready';
    NEW.preview_failure_reason := NULL;
    NEW.preview_last_error := NULL;

    IF NEW.preview_path ~* '\.mp4($|\?)' THEN
      NEW.preview_quality := 'optimal';
    ELSIF NEW.preview_path ~* '\.webp($|\?)' THEN
      NEW.preview_quality := 'degraded';
    ELSIF NEW.preview_path ~* '\.gif($|\?)' THEN
      NEW.preview_quality := 'preview_degraded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.content_files
SET preview_quality = CASE
  WHEN preview_path ~* '\.mp4($|\?)'  THEN 'optimal'
  WHEN preview_path ~* '\.webp($|\?)' THEN 'degraded'
  WHEN preview_path ~* '\.gif($|\?)'  THEN 'preview_degraded'
  ELSE preview_quality
END
WHERE preview_path IS NOT NULL AND preview_quality IS NULL;