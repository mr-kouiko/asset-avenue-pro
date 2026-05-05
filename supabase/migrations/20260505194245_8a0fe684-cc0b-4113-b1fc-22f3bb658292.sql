-- Add preview generation tracking columns to content_files
ALTER TABLE public.content_files
  ADD COLUMN IF NOT EXISTS preview_status text,
  ADD COLUMN IF NOT EXISTS preview_failure_reason text,
  ADD COLUMN IF NOT EXISTS preview_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS preview_last_error text;

CREATE INDEX IF NOT EXISTS idx_content_files_preview_status
  ON public.content_files (preview_status)
  WHERE preview_status = 'preview_failed';

-- When preview_path is set, mark as ready and clear failure
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_preview_status ON public.content_files;
CREATE TRIGGER trg_sync_preview_status
  BEFORE UPDATE ON public.content_files
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_preview_status_on_preview_path();

-- Admin RPC to manually retry failed previews (resets status so backfill picks them up)
CREATE OR REPLACE FUNCTION public.retry_failed_preview(_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  UPDATE public.content_files
  SET preview_status = NULL,
      preview_failure_reason = NULL,
      preview_last_error = NULL
  WHERE id = _file_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retry_failed_preview(uuid) TO authenticated;