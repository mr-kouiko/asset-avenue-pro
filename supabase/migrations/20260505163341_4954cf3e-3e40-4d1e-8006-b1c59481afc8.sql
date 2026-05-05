
CREATE OR REPLACE FUNCTION public.trigger_auto_translate_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/auto-translate-product';
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM net.http_post(
      url := v_url,
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8"}'::jsonb,
      body := jsonb_build_object('product_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;
