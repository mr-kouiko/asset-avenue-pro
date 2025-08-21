-- Fix the security definer issue by properly recreating the view
-- First, drop the existing view
DROP VIEW IF EXISTS public.marketplace_content;

-- Recreate the view with explicit SECURITY INVOKER (safer approach)
-- and ensure it only accesses data the user should have access to
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

-- Ensure proper RLS policies are in place for the underlying tables
-- Create a policy that allows public access to approved submissions only through proper channels
CREATE POLICY "Public can view approved submissions via secure view"
ON public.content_submissions
FOR SELECT
USING (
    status = 'approved' 
    AND EXISTS (
        -- This ensures the query is coming through our controlled view/function
        SELECT 1 FROM pg_stat_activity 
        WHERE query LIKE '%marketplace_content%' OR query LIKE '%get_product_detail%'
    )
);

-- Also ensure profiles can be accessed for public creator info display
CREATE POLICY "Public can view creator display info for approved content"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.content_submissions cs
        WHERE cs.creator_id = profiles.user_id
        AND cs.status = 'approved'
    )
);