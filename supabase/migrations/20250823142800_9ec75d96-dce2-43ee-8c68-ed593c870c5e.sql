-- SECURITY FIX: Remove overly permissive content_files policy and implement secure access
-- This fixes the vulnerability where original file paths could be accessed without purchase

-- 1. Remove the problematic policy that exposes original file paths
DROP POLICY IF EXISTS "Clients can view approved content files" ON public.content_files;

-- 2. Update the public access policy to be more restrictive
DROP POLICY IF EXISTS "Public can access approved file metadata only" ON public.content_files;

-- 3. Create a more restrictive public policy that only allows access to preview/thumbnail metadata
CREATE POLICY "Public can view previews and thumbnails only" 
ON public.content_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM content_submissions cs 
    WHERE cs.id = content_files.submission_id 
    AND cs.status = 'approved'
  ) 
  AND (
    (is_preview = true AND preview_path IS NOT NULL) 
    OR (thumbnail_path IS NOT NULL)
  )
  -- Explicitly exclude original file paths from public access
  AND is_original = false
);

-- 4. Create policy for authenticated users to access their purchased content
CREATE POLICY "Users can access purchased original files" 
ON public.content_files 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM downloads d
    JOIN content_submissions cs ON cs.id = content_files.submission_id
    WHERE d.user_id = auth.uid() 
    AND d.submission_id = content_files.submission_id
    AND cs.status = 'approved'
    AND (d.expires_at IS NULL OR d.expires_at > now())
  )
  AND is_original = true
);

-- 5. Create secure download tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.secure_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_file_id UUID NOT NULL REFERENCES public.content_files(id),
  download_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on secure_downloads
ALTER TABLE public.secure_downloads ENABLE ROW LEVEL SECURITY;

-- Create policies for secure_downloads
CREATE POLICY "Users can view their own secure downloads" 
ON public.secure_downloads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage secure downloads" 
ON public.secure_downloads 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 6. Update storage bucket policies to prevent direct access to original files
-- Remove overly permissive storage policies
DROP POLICY IF EXISTS "Public can view files in uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can access approved file metadata only" ON storage.objects;

-- Create more restrictive storage policies
CREATE POLICY "Users can view their own uploaded files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view preview files only" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'uploads' 
  AND (
    name LIKE '%/preview/%' 
    OR name LIKE '%/thumbnail/%'
    OR name LIKE '%_preview.%'
    OR name LIKE '%_thumbnail.%'
  )
);

-- 7. Create secure download function for authorized access
CREATE OR REPLACE FUNCTION public.create_secure_download_token(
  content_file_id_param UUID,
  user_id_param UUID DEFAULT auth.uid()
) 
RETURNS TABLE(download_token TEXT, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Generate secure token
  token := encode(gen_random_bytes(32), 'base64');
  expiry := now() + interval '24 hours';

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
$$;