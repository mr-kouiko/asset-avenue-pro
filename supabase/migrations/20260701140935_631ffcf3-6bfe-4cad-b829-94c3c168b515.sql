
-- 1) Helper: is_infinity_active(uid)
CREATE OR REPLACE FUNCTION public.is_infinity_active(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND plan_type = 'infinity'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_infinity_active(uuid) TO authenticated, anon, service_role;

-- 2) Helper: is category eligible for Infinity (photo/audio/vector)
CREATE OR REPLACE FUNCTION public.is_infinity_eligible_file(_content_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.content_files cf
    JOIN public.content_submissions cs ON cs.id = cf.submission_id
    JOIN public.categories cat ON cat.id = cs.category_id
    WHERE cf.id = _content_file_id
      AND cat.slug IN ('photo','audio','vector')
      AND cs.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_infinity_eligible_file(uuid) TO authenticated, service_role;

-- 3) Extend create_secure_download_token: allow Infinity subscribers to bypass
--    purchase requirement for eligible categories, and log a download row.
CREATE OR REPLACE FUNCTION public.create_secure_download_token(
  content_file_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS TABLE(download_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  token TEXT;
  expiry TIMESTAMP WITH TIME ZONE;
  has_purchase BOOLEAN;
  infinity_ok BOOLEAN;
  sub_id UUID;
BEGIN
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Existing purchase path
  SELECT EXISTS (
    SELECT 1 FROM downloads d
    JOIN content_files cf ON cf.submission_id = d.submission_id
    WHERE cf.id = content_file_id_param
      AND d.user_id = user_id_param
      AND (d.expires_at IS NULL OR d.expires_at > now())
  ) INTO has_purchase;

  IF NOT has_purchase THEN
    -- Infinity bypass path: active sub + eligible category
    infinity_ok := public.is_infinity_active(user_id_param)
               AND public.is_infinity_eligible_file(content_file_id_param);

    IF NOT infinity_ok THEN
      RAISE EXCEPTION 'Access denied to this content file';
    END IF;

    -- Log a download row for audit / analytics (idempotent per user+submission)
    SELECT submission_id INTO sub_id FROM public.content_files WHERE id = content_file_id_param;
    IF sub_id IS NOT NULL THEN
      INSERT INTO public.downloads (user_id, submission_id, downloaded_at)
      VALUES (user_id_param, sub_id, now())
      ON CONFLICT (user_id, submission_id) DO UPDATE
        SET downloaded_at = EXCLUDED.downloaded_at;
    END IF;
  END IF;

  token := encode(extensions.gen_random_bytes(32), 'hex');
  expiry := now() + interval '1 hour';

  INSERT INTO public.secure_downloads (user_id, content_file_id, download_token, expires_at)
  VALUES (user_id_param, content_file_id_param, token, expiry);

  RETURN QUERY SELECT token, expiry;
END;
$function$;

-- 4) Auto-expire lapsed Infinity subs (safety): a trigger/function callable
--    by a cron isn't strictly required because is_infinity_active checks
--    current_period_end > now(), but flip the row for cleanliness.
CREATE OR REPLACE FUNCTION public.expire_lapsed_subscriptions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'active'
     AND current_period_end IS NOT NULL
     AND current_period_end <= now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_lapsed_subscriptions() TO service_role;
