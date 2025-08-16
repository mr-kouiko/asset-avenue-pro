-- Fix WARN: Function Search Path Mutable for log_role_change function
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit (user_id, new_role, changed_by)
    VALUES (NEW.user_id, NEW.role, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix WARN: Function Search Path Mutable for generate_secure_download_url function
CREATE OR REPLACE FUNCTION public.generate_secure_download_url(
  submission_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  download_url text,
  expires_at timestamp with time zone
)
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
    SELECT 1 FROM downloads d
    WHERE d.submission_id = submission_id_param
    AND d.user_id = user_id_param
    AND (d.expires_at IS NULL OR d.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied to this content';
  END IF;

  -- Get the original file path
  SELECT cf.file_path INTO file_path
  FROM content_files cf
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