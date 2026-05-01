
DROP FUNCTION IF EXISTS public.get_seller_earnings_summary(uuid);

CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  paypal_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paypal_payout_batch_id TEXT,
  earnings_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_requests_seller ON public.payout_requests(seller_id, created_at DESC);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers create own payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Admins view all payout requests" ON public.payout_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update payout requests" ON public.payout_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages payouts" ON public.payout_requests
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.seller_earnings
  ADD COLUMN IF NOT EXISTS payout_request_id UUID REFERENCES public.payout_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seller_earnings_payout_request ON public.seller_earnings(payout_request_id);

CREATE OR REPLACE FUNCTION public.mature_seller_earnings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE seller_earnings
  SET status = 'available', available_at = now(), updated_at = now()
  WHERE status = 'pending' AND created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.request_seller_payout(p_paypal_email TEXT, p_min_amount NUMERIC DEFAULT 50)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id UUID := auth.uid();
  v_total NUMERIC; v_count INTEGER; v_request_id UUID;
BEGIN
  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_paypal_email IS NULL OR p_paypal_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Valid PayPal email required';
  END IF;

  SELECT COALESCE(SUM(net_amount), 0), COUNT(*) INTO v_total, v_count
  FROM seller_earnings WHERE seller_id = v_seller_id AND status = 'available';

  IF v_total < p_min_amount THEN
    RAISE EXCEPTION 'Minimum payout is $%. Available: $%', p_min_amount, v_total;
  END IF;

  INSERT INTO payout_requests (seller_id, amount, paypal_email, earnings_count)
  VALUES (v_seller_id, v_total, p_paypal_email, v_count)
  RETURNING id INTO v_request_id;

  UPDATE seller_earnings
  SET status = 'requested', payout_request_id = v_request_id, updated_at = now()
  WHERE seller_id = v_seller_id AND status = 'available';

  RETURN v_request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_seller_earnings_summary(p_seller_id UUID)
RETURNS TABLE (
  pending_amount NUMERIC, available_amount NUMERIC, requested_amount NUMERIC,
  paid_amount NUMERIC, refunded_amount NUMERIC,
  lifetime_gross NUMERIC, lifetime_commission NUMERIC, total_sales BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'pending'), 0)::NUMERIC,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'available'), 0)::NUMERIC,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'requested'), 0)::NUMERIC,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'refunded'), 0)::NUMERIC,
    COALESCE(SUM(gross_amount) FILTER (WHERE status != 'refunded'), 0)::NUMERIC,
    COALESCE(SUM(commission_amount) FILTER (WHERE status != 'refunded'), 0)::NUMERIC,
    COUNT(*) FILTER (WHERE status != 'refunded')::BIGINT
  FROM seller_earnings WHERE seller_id = p_seller_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(
  p_request_id UUID, p_paypal_batch_id TEXT DEFAULT NULL, p_admin_notes TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  UPDATE payout_requests
  SET status = 'paid', paid_at = now(), processed_at = now(), processed_by = auth.uid(),
      paypal_payout_batch_id = COALESCE(p_paypal_batch_id, paypal_payout_batch_id),
      admin_notes = COALESCE(p_admin_notes, admin_notes), updated_at = now()
  WHERE id = p_request_id;
  UPDATE seller_earnings SET status = 'paid', updated_at = now()
  WHERE payout_request_id = p_request_id AND status = 'requested';
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout(p_request_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  UPDATE payout_requests
  SET status = 'rejected', rejection_reason = p_reason, processed_at = now(),
      processed_by = auth.uid(), updated_at = now()
  WHERE id = p_request_id;
  UPDATE seller_earnings
  SET status = 'available', payout_request_id = NULL, updated_at = now()
  WHERE payout_request_id = p_request_id AND status = 'requested';
END; $$;

SELECT cron.schedule('mature-seller-earnings-daily', '15 2 * * *',
  $$ SELECT public.mature_seller_earnings(); $$);
