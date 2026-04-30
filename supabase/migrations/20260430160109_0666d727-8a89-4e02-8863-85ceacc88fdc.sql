-- VideoAI credits wallet
CREATE TABLE public.videoai_credits (
  user_id UUID NOT NULL PRIMARY KEY,
  credits_balance INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videoai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own videoai credits"
  ON public.videoai_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all videoai credits"
  ON public.videoai_credits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages videoai credits"
  ON public.videoai_credits FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- VideoAI transactions ledger
CREATE TABLE public.videoai_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase','spend','refund','bonus')),
  credits_delta INTEGER NOT NULL,
  reason TEXT,
  generation_id UUID,
  paypal_order_id TEXT,
  pack_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videoai_tx_user ON public.videoai_transactions(user_id, created_at DESC);

ALTER TABLE public.videoai_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own videoai transactions"
  ON public.videoai_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all videoai transactions"
  ON public.videoai_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages videoai transactions"
  ON public.videoai_transactions FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- AI Video generations history
CREATE TABLE public.ai_video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  duration INTEGER NOT NULL,
  resolution INTEGER NOT NULL,
  aspect_ratio TEXT NOT NULL,
  audio BOOLEAN NOT NULL DEFAULT true,
  credits_spent INTEGER NOT NULL,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_video_gen_user ON public.ai_video_generations(user_id, created_at DESC);

ALTER TABLE public.ai_video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own video generations"
  ON public.ai_video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own video generations"
  ON public.ai_video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all video generations"
  ON public.ai_video_generations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages video generations"
  ON public.ai_video_generations FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- RPC: add VideoAI credits (purchase / refund / bonus)
CREATE OR REPLACE FUNCTION public.add_videoai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'purchase',
  p_reason TEXT DEFAULT NULL,
  p_paypal_order_id TEXT DEFAULT NULL,
  p_pack_id TEXT DEFAULT NULL,
  p_generation_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  INSERT INTO public.videoai_credits (user_id, credits_balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    credits_balance = videoai_credits.credits_balance + EXCLUDED.credits_balance,
    updated_at = now()
  RETURNING credits_balance INTO v_new_balance;

  INSERT INTO public.videoai_transactions
    (user_id, type, credits_delta, reason, paypal_order_id, pack_id, generation_id)
  VALUES
    (p_user_id, p_type, p_amount, p_reason, p_paypal_order_id, p_pack_id, p_generation_id);

  RETURN v_new_balance;
END;
$$;

-- RPC: spend VideoAI credits atomically
CREATE OR REPLACE FUNCTION public.spend_videoai_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_generation_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'video_generation'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.videoai_credits
  SET credits_balance = credits_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1; -- insufficient balance signal
  END IF;

  INSERT INTO public.videoai_transactions
    (user_id, type, credits_delta, reason, generation_id)
  VALUES
    (p_user_id, 'spend', -p_amount, p_reason, p_generation_id);

  RETURN v_new_balance;
END;
$$;

-- Storage bucket for generated AI videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ai-videos', 'ai-videos', true, 52428800, ARRAY['video/mp4','video/webm'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ai-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-videos');

CREATE POLICY "Service role manages ai-videos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'ai-videos' AND current_setting('role') = 'service_role')
  WITH CHECK (bucket_id = 'ai-videos' AND current_setting('role') = 'service_role');