
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: when a content_submission becomes 'approved', call auto-translate edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_translate_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/auto-translate-product';
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM extensions.http_post(
      url := v_url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('product_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_translate_on_approval ON public.content_submissions;
CREATE TRIGGER auto_translate_on_approval
AFTER INSERT OR UPDATE OF status ON public.content_submissions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_translate_product();
