
CREATE OR REPLACE FUNCTION public.increment_preview_attempts(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.content_files
  SET preview_attempts = COALESCE(preview_attempts, 0) + 1
  WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.auto_approve_when_preview_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.file_type = 'video'
     AND NEW.preview_path IS NOT NULL
     AND NEW.preview_path <> ''
     AND COALESCE(NEW.preview_status, '') IN ('ready', 'preview_available')
     AND (TG_OP = 'INSERT' OR OLD.preview_path IS DISTINCT FROM NEW.preview_path OR OLD.preview_status IS DISTINCT FROM NEW.preview_status)
  THEN
    UPDATE public.content_submissions
    SET status = 'approved', updated_at = now()
    WHERE id = NEW.submission_id
      AND status = 'processing_preview';
  END IF;
  RETURN NEW;
END;
$function$;
