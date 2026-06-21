
-- Remove Stripe completely

-- 1) Drop stripe_accounts table
DROP TABLE IF EXISTS public.stripe_accounts CASCADE;

-- 2) Update admin_update_platform_settings to remove the Stripe parameter
DROP FUNCTION IF EXISTS public.admin_update_platform_settings(numeric, numeric);

CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(
  new_commission_rate numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.platform_settings
  SET
    commission_rate = COALESCE(new_commission_rate, commission_rate),
    updated_at = now();
END;
$$;

-- 3) Update admin_get_platform_settings to remove the stripe column from return
DROP FUNCTION IF EXISTS public.admin_get_platform_settings();

CREATE OR REPLACE FUNCTION public.admin_get_platform_settings()
RETURNS TABLE(
  id uuid,
  commission_rate numeric,
  ai_auto_generate_enabled boolean,
  ai_provider text,
  ai_model text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    ps.id,
    ps.commission_rate,
    ps.ai_auto_generate_enabled,
    ps.ai_provider,
    ps.ai_model
  FROM public.platform_settings ps
  LIMIT 1;
END;
$$;

-- 4) Drop the obsolete column
ALTER TABLE public.platform_settings DROP COLUMN IF EXISTS stripe_application_fee_rate;
