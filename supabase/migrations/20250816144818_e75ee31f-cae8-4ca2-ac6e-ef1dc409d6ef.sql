-- Fix CRITICAL: Remove privilege escalation vulnerability in user_roles
-- Users should only be able to insert 'client' role, not admin/creator roles
DROP POLICY IF EXISTS "Users can insert their own roles during signup" ON public.user_roles;

CREATE POLICY "Users can only insert client role during signup" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND role = 'client'::app_role
);

-- Add policy for admins to assign roles to users
CREATE POLICY "Admins can assign any role to users" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix CRITICAL: Make seller-content bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'seller-content';

-- Update storage policies for seller-content bucket to use proper access control
DROP POLICY IF EXISTS "Users can upload to seller-content" ON storage.objects;
DROP POLICY IF EXISTS "Public can view seller-content" ON storage.objects;

-- Only creators can upload to their own folder in seller-content
CREATE POLICY "Creators can upload to their folder in seller-content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'seller-content' 
  AND has_role(auth.uid(), 'creator'::app_role)
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Only creators can view their own files in seller-content
CREATE POLICY "Creators can view their own files in seller-content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'seller-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all files in seller-content
CREATE POLICY "Admins can view all files in seller-content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'seller-content' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Clients can only view approved content files
CREATE POLICY "Clients can view approved content files in seller-content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'seller-content' 
  AND EXISTS (
    SELECT 1 FROM content_files cf
    JOIN content_submissions cs ON cf.submission_id = cs.id
    WHERE cf.file_path = name
    AND cs.status = 'approved'
  )
);

-- Update original-files bucket policies for better security
DROP POLICY IF EXISTS "Users can access original files" ON storage.objects;

-- Only the creator who uploaded can access original files
CREATE POLICY "Creators can access their original files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'original-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Clients can only access original files they purchased
CREATE POLICY "Clients can access purchased original files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'original-files' 
  AND EXISTS (
    SELECT 1 FROM downloads d
    JOIN content_files cf ON d.submission_id = cf.submission_id
    WHERE cf.file_path = name
    AND d.user_id = auth.uid()
    AND (d.expires_at IS NULL OR d.expires_at > now())
  )
);

-- Admins can access all original files
CREATE POLICY "Admins can access all original files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'original-files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add audit table for role changes
CREATE TABLE IF NOT EXISTS public.role_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text
);

-- Enable RLS on audit table
ALTER TABLE public.role_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view role audit logs" 
ON public.role_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for role change auditing
DROP TRIGGER IF EXISTS role_change_audit ON public.user_roles;
CREATE TRIGGER role_change_audit
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Create function to generate secure download URLs
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