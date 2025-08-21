-- Fix search path security issues for functions that don't have it set properly

-- Update existing functions to have secure search_path settings
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_public_info(creator_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, store_name text, avatar_url text)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.user_id,
        p.display_name,
        p.store_name,
        p.avatar_url
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = ANY(creator_ids)
    AND ur.role = 'creator'
    AND EXISTS (
        SELECT 1 
        FROM public.content_submissions cs 
        WHERE cs.creator_id = p.user_id 
        AND cs.status = 'approved'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_product_detail(product_id uuid)
RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, creator_display_name text, creator_store_name text, category_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.price,
        cs.tags,
        cs.created_at,
        cs.category_id,
        COALESCE(p.display_name, 'Créateur anonyme') as creator_display_name,
        COALESCE(p.store_name, '') as creator_store_name,
        COALESCE(c.name, '') as category_name
    FROM public.content_submissions cs
    LEFT JOIN public.profiles p ON p.user_id = cs.creator_id  
    LEFT JOIN public.categories c ON c.id = cs.category_id
    WHERE cs.id = product_id 
    AND cs.status = 'approved';
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_secure_download_url(submission_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE(download_url text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_path text;
  signed_url text;
  expiry_time timestamp with time zone;
BEGIN
  -- Check if user has access to this content
  IF NOT EXISTS (
    SELECT 1 FROM public.downloads d
    WHERE d.submission_id = submission_id_param
    AND d.user_id = user_id_param
    AND (d.expires_at IS NULL OR d.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied to this content';
  END IF;

  -- Get the original file path
  SELECT cf.file_path INTO file_path
  FROM public.content_files cf
  WHERE cf.submission_id = submission_id_param
  AND cf.is_original = true
  LIMIT 1;

  IF file_path IS NULL THEN
    RAISE EXCEPTION 'Original file not found';
  END IF;

  -- Set expiry time (24 hours from now)
  expiry_time := now() + interval '24 hours';

  -- Generate signed URL (this would need to be implemented with actual Supabase storage signing)
  -- For now, return the path - in production, this should use Supabase's signed URL functionality
  signed_url := file_path;

  RETURN QUERY SELECT signed_url, expiry_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the profile owner or admin can access full profile data including emails
  RETURN (
    auth.uid() = profile_user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
END;
$$;