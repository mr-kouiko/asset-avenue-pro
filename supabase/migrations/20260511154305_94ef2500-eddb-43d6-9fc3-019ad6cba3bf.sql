CREATE OR REPLACE FUNCTION public.sync_submission_dimensions_from_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w int;
  v_h int;
BEGIN
  IF NEW.submission_id IS NULL OR NEW.is_original IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_w := NULLIF(GREATEST(
    COALESCE((NEW.metadata->>'width')::int, 0),
    COALESCE((NEW.metadata->>'videoWidth')::int, 0)
  ), 0);
  v_h := NULLIF(GREATEST(
    COALESCE((NEW.metadata->>'height')::int, 0),
    COALESCE((NEW.metadata->>'videoHeight')::int, 0)
  ), 0);

  IF v_w IS NOT NULL AND v_h IS NOT NULL THEN
    UPDATE public.content_submissions
       SET width  = v_w,
           height = v_h
     WHERE id = NEW.submission_id
       AND (width IS DISTINCT FROM v_w OR height IS DISTINCT FROM v_h);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_submission_dimensions ON public.content_files;
CREATE TRIGGER trg_sync_submission_dimensions
AFTER INSERT OR UPDATE OF metadata ON public.content_files
FOR EACH ROW
EXECUTE FUNCTION public.sync_submission_dimensions_from_file();