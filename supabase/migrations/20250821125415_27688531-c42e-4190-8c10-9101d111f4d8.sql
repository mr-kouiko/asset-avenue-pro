-- Fix the security definer issue by dropping dependencies first
-- Drop the dependent policy first
DROP POLICY IF EXISTS "Public can view files for approved content" ON public.content_files;

-- Drop the problematic view
DROP VIEW IF EXISTS public.marketplace_content CASCADE;

-- Recreate the view with SECURITY INVOKER (safer approach)
CREATE VIEW public.marketplace_content 
WITH (security_invoker = true)
AS
SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.price,
    cs.tags,
    cs.created_at,
    cs.category_id,
    -- Use a hash instead of real creator_id for privacy
    encode(digest(cs.creator_id::text, 'sha256'), 'hex') as creator_hash,
    -- Get creator display info without exposing the actual user_id
    COALESCE(p.display_name, 'Créateur anonyme') as creator_display_name,
    COALESCE(p.store_name, '') as creator_store_name
FROM public.content_submissions cs
LEFT JOIN public.profiles p ON p.user_id = cs.creator_id
WHERE cs.status = 'approved';

-- Grant appropriate permissions to the view
GRANT SELECT ON public.marketplace_content TO authenticated, anon;

-- Recreate a simpler policy for content files that doesn't depend on the view
CREATE POLICY "Files accessible for approved products"
ON public.content_files
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.content_submissions cs
        WHERE cs.id = content_files.submission_id 
        AND cs.status = 'approved'
    )
);

-- Create a more specific policy for public access to approved submissions
CREATE POLICY "Public read access to approved submissions"
ON public.content_submissions
FOR SELECT
USING (status = 'approved');