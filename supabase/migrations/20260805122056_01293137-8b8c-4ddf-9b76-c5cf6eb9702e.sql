CREATE OR REPLACE FUNCTION public.admin_get_ai_edit_events(_limit int DEFAULT 500)
RETURNS TABLE (
  id uuid, user_id uuid, prompt text, image_url text, source_image_url text,
  action text, status text, error_message text, created_at timestamptz,
  user_email text, user_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.user_id, g.prompt, g.image_url, g.source_image_url,
         g.action, g.status, g.error_message, g.created_at,
         p.email, p.display_name
  FROM public.ai_image_generations g
  LEFT JOIN public.profiles p ON p.user_id = g.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY g.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 500), 2000);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_download_events(_limit int DEFAULT 1000)
RETURNS TABLE (
  id uuid, user_id uuid, submission_id uuid, downloaded_at timestamptz,
  created_at timestamptz, user_email text, product_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.user_id, d.submission_id, d.downloaded_at, d.created_at,
         p.email, s.title
  FROM public.downloads d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.content_submissions s ON s.id = d.submission_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY d.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 1000), 5000);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_pexels_download_events(_limit int DEFAULT 1000)
RETURNS TABLE (
  id uuid, user_id uuid, pexels_id bigint, media_type text, author text,
  downloaded_at timestamptz, user_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT x.id, x.user_id, x.pexels_id, x.media_type, x.author, x.downloaded_at, p.email
  FROM public.pexels_downloads x
  LEFT JOIN public.profiles p ON p.user_id = x.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY x.downloaded_at DESC
  LIMIT LEAST(COALESCE(_limit, 1000), 5000);
$$;

REVOKE ALL ON FUNCTION public.admin_get_ai_edit_events(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_download_events(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_pexels_download_events(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_edit_events(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_download_events(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pexels_download_events(int) TO authenticated;