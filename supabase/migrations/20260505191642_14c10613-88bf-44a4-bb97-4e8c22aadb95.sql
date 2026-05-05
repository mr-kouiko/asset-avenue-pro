
-- 1. Trigger function: block approval of video submissions without preview_path
CREATE OR REPLACE FUNCTION public.enforce_video_preview_before_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_video BOOLEAN;
  v_missing_preview BOOLEAN;
BEGIN
  -- Only check transitions to approved states
  IF NEW.status NOT IN ('approved', 'approved_ai_assisted') THEN
    RETURN NEW;
  END IF;

  -- Check if this submission has a video file
  SELECT EXISTS (
    SELECT 1 FROM public.content_files
    WHERE submission_id = NEW.id AND file_type = 'video'
  ) INTO v_has_video;

  IF NOT v_has_video THEN
    RETURN NEW;
  END IF;

  -- Check if any video file is missing preview_path
  SELECT EXISTS (
    SELECT 1 FROM public.content_files
    WHERE submission_id = NEW.id
      AND file_type = 'video'
      AND (preview_path IS NULL OR preview_path = '')
  ) INTO v_missing_preview;

  IF v_missing_preview THEN
    -- Force status to processing_preview instead of approving
    NEW.status := 'processing_preview';
    RAISE NOTICE 'Submission % held in processing_preview: video preview not yet generated', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_video_preview_before_approval ON public.content_submissions;
CREATE TRIGGER trg_enforce_video_preview_before_approval
BEFORE INSERT OR UPDATE OF status ON public.content_submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_video_preview_before_approval();

-- 2. Hide existing approved videos without preview_path
UPDATE public.content_submissions cs
SET status = 'processing_preview',
    updated_at = now()
WHERE cs.status IN ('approved', 'approved_ai_assisted')
  AND EXISTS (
    SELECT 1 FROM public.content_files cf
    WHERE cf.submission_id = cs.id
      AND cf.file_type = 'video'
      AND (cf.preview_path IS NULL OR cf.preview_path = '')
  );

-- 3. Auto-promote back to 'approved' once preview_path is set on the video file
CREATE OR REPLACE FUNCTION public.auto_approve_when_preview_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.file_type = 'video'
     AND NEW.preview_path IS NOT NULL
     AND NEW.preview_path <> ''
     AND (TG_OP = 'INSERT' OR OLD.preview_path IS DISTINCT FROM NEW.preview_path)
  THEN
    UPDATE public.content_submissions
    SET status = 'approved', updated_at = now()
    WHERE id = NEW.submission_id
      AND status = 'processing_preview';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_when_preview_ready ON public.content_files;
CREATE TRIGGER trg_auto_approve_when_preview_ready
AFTER INSERT OR UPDATE OF preview_path ON public.content_files
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_when_preview_ready();
