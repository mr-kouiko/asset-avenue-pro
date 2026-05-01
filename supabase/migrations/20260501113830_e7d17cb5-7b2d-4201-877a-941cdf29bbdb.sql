
-- 1) Update platform commission rate to 40% (seller keeps 60%)
UPDATE public.platform_settings SET commission_rate = 0.40, updated_at = now();

-- 2) Seller earnings ledger
CREATE TABLE IF NOT EXISTS public.seller_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid,
  submission_id uuid,
  paypal_order_id text,
  source text NOT NULL DEFAULT 'marketplace',
  gross_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  available_at timestamptz,
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller ON public.seller_earnings(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_order ON public.seller_earnings(paypal_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_earnings_order_item ON public.seller_earnings(paypal_order_id, submission_id) WHERE paypal_order_id IS NOT NULL AND submission_id IS NOT NULL;

ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own earnings"
  ON public.seller_earnings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins view all earnings"
  ON public.seller_earnings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update earnings"
  ON public.seller_earnings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages earnings"
  ON public.seller_earnings FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

CREATE TRIGGER trg_seller_earnings_updated
BEFORE UPDATE ON public.seller_earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RPC for sellers/admins to view earnings summary
CREATE OR REPLACE FUNCTION public.get_seller_earnings_summary(p_seller_id uuid)
RETURNS TABLE (
  pending_amount numeric,
  available_amount numeric,
  paid_amount numeric,
  refunded_amount numeric,
  lifetime_gross numeric,
  total_orders bigint,
  currency text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0)   AS pending_amount,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'available'), 0) AS available_amount,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'paid'), 0)      AS paid_amount,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'refunded'), 0)  AS refunded_amount,
    COALESCE(SUM(gross_amount), 0)                                   AS lifetime_gross,
    COUNT(DISTINCT paypal_order_id)                                  AS total_orders,
    'USD'::text                                                      AS currency
  FROM public.seller_earnings
  WHERE seller_id = p_seller_id
    AND (auth.uid() = p_seller_id OR has_role(auth.uid(), 'admin'::app_role));
$$;

-- 4) Auto-cleanup webhook events older than 90 days (hygiene)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.paypal_webhook_events WHERE created_at < now() - interval '90 days';
$$;

SELECT cron.schedule(
  'cleanup-paypal-webhook-events-daily',
  '0 4 * * *',
  $$ SELECT public.cleanup_old_webhook_events(); $$
);
