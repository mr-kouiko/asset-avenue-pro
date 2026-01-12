-- Create function to give new users 5 free credits
CREATE OR REPLACE FUNCTION public.grant_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert 5 free credits for the new user
  INSERT INTO public.user_credits (user_id, credits_balance, total_purchased, total_used)
  VALUES (NEW.id, 5, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to grant credits on signup
CREATE TRIGGER on_auth_user_created_grant_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_user_credits();

-- Also grant 5 credits to existing users who don't have any credits yet
INSERT INTO public.user_credits (user_id, credits_balance, total_purchased, total_used)
SELECT id, 5, 0, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;