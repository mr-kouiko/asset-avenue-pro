CREATE OR REPLACE FUNCTION public.create_secure_download_token(content_file_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE(download_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token TEXT;
  expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verify user has access to this file
  IF NOT EXISTS (
    SELECT 1 FROM downloads d
    JOIN content_files cf ON cf.submission_id = d.submission_id
    WHERE cf.id = content_file_id_param
    AND d.user_id = user_id_param
    AND (d.expires_at IS NULL OR d.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied to this content file';
  END IF;

  -- Generate URL-safe secure token
  token := encode(extensions.gen_random_bytes(32), 'hex');
  expiry := now() + interval '1 hour';

  -- Store secure download record
  INSERT INTO public.secure_downloads (
    user_id,
    content_file_id,
    download_token,
    expires_at
  ) VALUES (
    user_id_param,
    content_file_id_param,
    token,
    expiry
  );

  RETURN QUERY SELECT token, expiry;
END;
$function$;