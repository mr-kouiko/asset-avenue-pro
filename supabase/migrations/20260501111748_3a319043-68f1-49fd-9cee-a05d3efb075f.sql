-- 1. Webhook event log (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_event_type ON public.paypal_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_resource_id ON public.paypal_webhook_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_created_at ON public.paypal_webhook_events(created_at DESC);

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins (via has_role) can read; nobody can write from client (service role bypasses RLS)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE 'CREATE POLICY "Admins can view webhook events" ON public.paypal_webhook_events FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Subscription expiration function
CREATE OR REPLACE FUNCTION public.expire_ended_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.user_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND current_period_end IS NOT NULL
    AND current_period_end < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- 3. pg_cron schedule (every hour)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-ended-subscriptions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-ended-subscriptions',
  '0 * * * *',
  $$ SELECT public.expire_ended_subscriptions(); $$
);