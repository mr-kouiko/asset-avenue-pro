CREATE TABLE public.google_merchant_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.content_submissions(id) ON DELETE SET NULL,
  action text NOT NULL,
  status text NOT NULL,
  error text,
  google_product_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gms_log_created_at ON public.google_merchant_sync_log(created_at DESC);
CREATE INDEX idx_gms_log_submission ON public.google_merchant_sync_log(submission_id);

GRANT SELECT, INSERT ON public.google_merchant_sync_log TO authenticated;
GRANT ALL ON public.google_merchant_sync_log TO service_role;

ALTER TABLE public.google_merchant_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read merchant sync log"
  ON public.google_merchant_sync_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages merchant sync log"
  ON public.google_merchant_sync_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE public.merchant_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('upsert','delete')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_msq_pending ON public.merchant_sync_queue(created_at) WHERE processed_at IS NULL;

GRANT SELECT ON public.merchant_sync_queue TO authenticated;
GRANT ALL ON public.merchant_sync_queue TO service_role;

ALTER TABLE public.merchant_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read merchant sync queue"
  ON public.merchant_sync_queue FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages merchant sync queue"
  ON public.merchant_sync_queue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enqueue_merchant_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.merchant_sync_queue (submission_id, action)
    VALUES (OLD.id, 'delete');
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' AND COALESCE(NEW.price, 0) > 0 THEN
      INSERT INTO public.merchant_sync_queue (submission_id, action)
      VALUES (NEW.id, 'upsert');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status = 'approved' AND COALESCE(NEW.price, 0) > 0 THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.price IS DISTINCT FROM NEW.price
       OR OLD.title IS DISTINCT FROM NEW.title
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.slug IS DISTINCT FROM NEW.slug THEN
      INSERT INTO public.merchant_sync_queue (submission_id, action)
      VALUES (NEW.id, 'upsert');
    END IF;
  ELSIF OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.merchant_sync_queue (submission_id, action)
    VALUES (NEW.id, 'delete');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_merchant_sync ON public.content_submissions;
CREATE TRIGGER trg_enqueue_merchant_sync
AFTER INSERT OR UPDATE OR DELETE ON public.content_submissions
FOR EACH ROW EXECUTE FUNCTION public.enqueue_merchant_sync();