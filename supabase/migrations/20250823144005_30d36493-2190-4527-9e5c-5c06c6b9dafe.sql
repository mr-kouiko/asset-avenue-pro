-- Security Fix Migration: Lock down digital asset access
-- 1. Remove permissive insert policy on downloads table
DROP POLICY IF EXISTS "Users can create downloads for approved content" ON public.downloads;

-- 2. Create restrictive service-role only insert policy for downloads
CREATE POLICY "Service role can create downloads only"
ON public.downloads
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Make storage buckets private for original content
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('original-files', 'uploads', 'seller-content');

-- 4. Remove/deprecate the insecure generate_secure_download_url function
DROP FUNCTION IF EXISTS public.generate_secure_download_url(uuid, uuid);

-- 5. Create comprehensive RLS policies for storage.objects to prevent public access to originals
DROP POLICY IF EXISTS "Public can view approved content files" ON storage.objects;
DROP POLICY IF EXISTS "Creators can upload to seller-content" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to uploads bucket" ON storage.objects;

-- Allow public access only to previews and thumbnails
CREATE POLICY "Public can view previews and thumbnails"
ON storage.objects
FOR SELECT
USING (
  bucket_id IN ('previews', 'thumbnails', 'user-avatars') OR
  (bucket_id = 'uploads' AND name LIKE '%preview%') OR
  (bucket_id = 'uploads' AND name LIKE '%thumbnail%')
);

-- Creators can upload to seller-content (their own folder)
CREATE POLICY "Creators can upload to seller-content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'seller-content' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  has_role(auth.uid(), 'creator'::app_role)
);

-- Users can upload to uploads bucket (their own folder)
CREATE POLICY "Users can upload to uploads bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Only purchased users can access original files through secure downloads
CREATE POLICY "Secure access to original files"
ON storage.objects
FOR SELECT
USING (
  bucket_id IN ('original-files', 'seller-content') AND
  EXISTS (
    SELECT 1 FROM public.secure_downloads sd
    JOIN public.content_files cf ON cf.id = sd.content_file_id
    WHERE sd.user_id = auth.uid()
    AND sd.expires_at > now()
    AND sd.downloaded_at IS NULL
    AND (cf.file_path = name OR cf.file_path LIKE '%' || name || '%')
  )
);

-- Admins can access everything
CREATE POLICY "Admins can access all storage objects"
ON storage.objects
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Make secure download tokens single-use by updating the function
CREATE OR REPLACE FUNCTION public.create_secure_download_token(
  content_file_id_param uuid, 
  user_id_param uuid DEFAULT auth.uid()
)
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

  -- Generate secure token (shorter expiry for security)
  token := encode(gen_random_bytes(32), 'base64');
  expiry := now() + interval '1 hour'; -- Reduced from 24 hours

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

-- 7. Add function to mark tokens as used (single-use)
CREATE OR REPLACE FUNCTION public.mark_download_token_used(token_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.secure_downloads 
  SET downloaded_at = now(),
      ip_address = inet(COALESCE(current_setting('request.header.x-forwarded-for', true), '127.0.0.1')),
      user_agent = current_setting('request.header.user-agent', true)
  WHERE download_token = token_param
  AND downloaded_at IS NULL
  AND expires_at > now();
  
  RETURN FOUND;
END;
$function$;

-- 8. Enhanced audit logging for security
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  details_param jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_table,
    details
  ) VALUES (
    event_type_param,
    auth.uid(),
    'security_events',
    details_param || jsonb_build_object(
      'timestamp', now(),
      'ip_address', COALESCE(current_setting('request.header.x-forwarded-for', true), 'unknown'),
      'user_agent', COALESCE(current_setting('request.header.user-agent', true), 'unknown')
    )
  );
END;
$function$;