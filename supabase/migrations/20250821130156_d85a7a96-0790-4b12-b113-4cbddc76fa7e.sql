-- SECURITY FIX: Remove email exposure vulnerability
-- Drop the problematic policy that exposes all profile fields including emails
DROP POLICY IF EXISTS "Public can view creator info for approved content" ON public.profiles;

-- Create a secure public view for creator information (non-sensitive fields only)
CREATE VIEW public.public_creator_profiles 
WITH (security_invoker = true)
AS
SELECT 
    -- Use a hash instead of actual user_id for privacy
    encode(digest(p.user_id::text, 'sha256'), 'hex') as creator_hash,
    p.display_name,
    p.store_name, 
    p.avatar_url,
    p.user_id -- Keep for internal joins, but access will be controlled by RLS
FROM public.profiles p
WHERE EXISTS (
    SELECT 1 FROM public.content_submissions cs
    WHERE cs.creator_id = p.user_id
    AND cs.status = 'approved'
);

-- Grant public access to the secure view
GRANT SELECT ON public.public_creator_profiles TO authenticated, anon;

-- Update the marketplace_content view to use the secure creator info
DROP VIEW IF EXISTS public.marketplace_content CASCADE;

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
    pcp.creator_hash,
    pcp.display_name as creator_display_name,
    pcp.store_name as creator_store_name
FROM public.content_submissions cs
LEFT JOIN public.public_creator_profiles pcp ON pcp.user_id = cs.creator_id
WHERE cs.status = 'approved';

-- Grant public access to the updated marketplace view
GRANT SELECT ON public.marketplace_content TO authenticated, anon;