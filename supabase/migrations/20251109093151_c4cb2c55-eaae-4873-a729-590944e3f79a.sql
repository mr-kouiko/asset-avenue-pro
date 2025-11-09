-- Create user_credits table for paid AI image generation
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own credits record (for initial setup)
CREATE POLICY "Users can insert their own credits"
ON public.user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only system/edge functions can update credits (via service role)
CREATE POLICY "Service role can update credits"
ON public.user_credits
FOR UPDATE
USING (auth.role() = 'service_role');

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_user_credit(
  user_id_param UUID,
  cost_param INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM user_credits
  WHERE user_id = user_id_param
  FOR UPDATE;
  
  -- If no record exists, create one with 0 balance
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, credits_balance, total_used)
    VALUES (user_id_param, 0, 0);
    RETURN FALSE; -- Insufficient credits
  END IF;
  
  -- Check if sufficient credits
  IF current_balance < cost_param THEN
    RETURN FALSE; -- Insufficient credits
  END IF;
  
  -- Deduct credits
  UPDATE user_credits
  SET 
    credits_balance = credits_balance - cost_param,
    total_used = total_used + cost_param,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  RETURN TRUE; -- Success
END;
$$;

-- Create function to add credits (for purchase/admin)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  user_id_param UUID,
  amount_param INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert or update credits
  INSERT INTO user_credits (user_id, credits_balance, total_purchased)
  VALUES (user_id_param, amount_param, amount_param)
  ON CONFLICT (user_id)
  DO UPDATE SET
    credits_balance = user_credits.credits_balance + amount_param,
    total_purchased = user_credits.total_purchased + amount_param,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Create index for performance
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop the old ai_image_generations table's limit (we'll keep the table for history)
-- But remove the count check since we're moving to credits system
COMMENT ON TABLE public.ai_image_generations IS 'Historique des générations IA - la limite est maintenant gérée par user_credits';