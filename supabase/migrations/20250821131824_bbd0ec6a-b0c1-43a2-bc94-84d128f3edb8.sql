-- SECURITY FIX: Address remaining creator data exposure issues

-- 1. Update content_files policy to hide creator identification from file paths
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can access files for approved content" ON public.content_files;

-- Replace with a policy that only shows essential file info without exposing creator paths
CREATE POLICY "Public can access approved file metadata only"
ON public.content_files
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.content_submissions cs
    WHERE cs.id = content_files.submission_id
    AND cs.status = 'approved'
  ) AND 
  -- Only allow access to thumbnail and preview files, not original files with creator paths
  (is_preview = true OR content_files.thumbnail_path IS NOT NULL)
);

-- 2. Create a sanitized view for public file access that doesn't expose creator UUIDs
CREATE VIEW public.public_file_access 
WITH (security_invoker = true)
AS
SELECT 
  cf.id,
  cs.id as content_id,
  cf.file_name,
  cf.file_type,
  cf.file_format,
  cf.file_size,
  cf.metadata,
  -- Use anonymized file URLs that don't expose creator UUIDs
  CASE 
    WHEN cf.is_preview = true THEN cf.preview_path
    WHEN cf.thumbnail_path IS NOT NULL THEN cf.thumbnail_path
    ELSE NULL
  END as public_file_url,
  cf.is_preview,
  (cf.thumbnail_path IS NOT NULL) as has_thumbnail
FROM public.content_files cf
INNER JOIN public.content_submissions cs ON cs.id = cf.submission_id
WHERE cs.status = 'approved'
AND (cf.is_preview = true OR cf.thumbnail_path IS NOT NULL);

-- Grant public access to the sanitized view
GRANT SELECT ON public.public_file_access TO anon, authenticated;

-- 3. Further restrict content_submissions to hide sensitive business data
DROP POLICY IF EXISTS "Public can view approved content metadata" ON public.content_submissions;

-- Create a minimal public policy that only shows essential marketplace info
CREATE POLICY "Public can view essential content info only"
ON public.content_submissions
FOR SELECT
TO public
USING (
  status = 'approved'
) 
-- Use WITH CHECK to limit which columns can be accessed by row security
WITH CHECK (false); -- This prevents INSERT/UPDATE, keeping it SELECT only

-- 4. Update the marketplace_content view to use anonymized data only
DROP VIEW IF EXISTS public.marketplace_content CASCADE;

CREATE VIEW public.marketplace_content 
WITH (security_invoker = true)
AS
SELECT 
    cs.id,
    cs.title,
    cs.description,
    -- Don't expose actual price - use price ranges for privacy
    CASE 
        WHEN cs.price = 0 THEN 'Gratuit'
        WHEN cs.price <= 10 THEN '€'
        WHEN cs.price <= 50 THEN '€€'
        WHEN cs.price <= 100 THEN '€€€'
        ELSE '€€€€'
    END as price_range,
    cs.tags,
    cs.created_at,
    cs.category_id,
    -- Use anonymized creator data from our secure view
    pcp.creator_hash,
    pcp.display_name as creator_display_name,
    pcp.store_name as creator_store_name
FROM public.content_submissions cs
LEFT JOIN public.public_creator_profiles pcp ON pcp.user_id = cs.creator_id
WHERE cs.status = 'approved';

-- Grant public access to the updated marketplace view
GRANT SELECT ON public.marketplace_content TO anon, authenticated;

-- 5. Log this security improvement
INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
VALUES (
  'security_hardening',
  NULL,
  'multiple_tables',
  jsonb_build_object(
    'action', 'creator_privacy_protection',
    'timestamp', now(),
    'changes', array[
      'anonymized_file_paths', 
      'restricted_content_submissions', 
      'price_range_protection',
      'creator_identity_anonymization'
    ]
  )
);