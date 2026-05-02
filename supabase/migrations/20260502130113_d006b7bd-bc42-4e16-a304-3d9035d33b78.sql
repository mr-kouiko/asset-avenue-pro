-- Update signup bonus: 5 image credits + 15 VideoAI credits
CREATE OR REPLACE FUNCTION public.grant_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 5 free image/SEO credits (user_credits wallet)
  INSERT INTO public.user_credits (user_id, credits_balance, total_purchased, total_used)
  VALUES (NEW.id, 5, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 15 free VideoAI credits (enough for 1 short video: Veo-3-fast 4s 720p)
  BEGIN
    PERFORM public.add_videoai_credits(
      NEW.id,
      15,
      'signup_bonus',
      'Welcome bonus: 1 free AI video generation'
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block user creation if videoai grant fails
    RAISE WARNING 'Failed to grant videoai signup bonus to %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;