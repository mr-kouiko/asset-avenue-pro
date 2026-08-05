CREATE OR REPLACE FUNCTION public.admin_get_ai_edit_events(_limit integer DEFAULT 500)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  prompt text,
  image_url text,
  source_image_url text,
  action text,
  status text,
  error_message text,
  created_at timestamptz,
  user_email text,
  user_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.user_id,
    g.prompt,
    CASE
      WHEN g.image_url IS NULL OR g.image_url LIKE 'data:%' THEN NULL::text
      ELSE g.image_url
    END AS image_url,
    CASE
      WHEN g.source_image_url IS NULL OR g.source_image_url LIKE 'data:%' THEN NULL::text
      ELSE g.source_image_url
    END AS source_image_url,
    g.action,
    g.status,
    g.error_message,
    g.created_at,
    p.email AS user_email,
    p.display_name AS user_name
  FROM public.ai_image_generations AS g
  LEFT JOIN public.profiles AS p ON p.user_id = g.user_id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY g.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 2000);
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_edit_events(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_edit_events(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_edit_events(integer) TO service_role;