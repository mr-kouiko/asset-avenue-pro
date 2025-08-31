-- Fix security issues with views by ensuring they use security_invoker instead of security_definer

-- First, recreate the marketplace_content view with proper security settings
DROP VIEW IF EXISTS public.marketplace_content;

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
    -- Determine content type based on the first original file
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM content_files cf 
            WHERE cf.submission_id = cs.id 
            AND cf.is_original = true 
            AND cf.file_type LIKE 'video/%'
        ) THEN 'video'
        WHEN EXISTS (
            SELECT 1 FROM content_files cf 
            WHERE cf.submission_id = cs.id 
            AND cf.is_original = true 
            AND cf.file_type LIKE 'audio/%'
        ) THEN 'audio'
        WHEN EXISTS (
            SELECT 1 FROM content_files cf 
            WHERE cf.submission_id = cs.id 
            AND cf.is_original = true 
            AND (cf.file_type = 'application/pdf' OR cf.file_type LIKE '%vector%' OR cf.file_format = 'svg')
        ) THEN 'illustration'
        ELSE 'photo'
    END as content_type,
    -- Get creator info
    p.display_name as creator_display_name,
    p.store_name as creator_store_name,
    -- Generate a creator hash for privacy
    encode(extensions.digest(cs.creator_id::text, 'sha256'), 'hex') as creator_hash,
    -- Get category name
    c.name as category_name
FROM public.content_submissions cs
LEFT JOIN public.profiles p ON p.user_id = cs.creator_id
LEFT JOIN public.categories c ON c.id = cs.category_id
WHERE cs.status = 'approved'  -- Only approved content
AND EXISTS (
    -- Only include submissions that have files
    SELECT 1 FROM content_files cf 
    WHERE cf.submission_id = cs.id
);

-- Fix other views that might have security_definer issues
-- Check and fix admin_profiles_safe view
DROP VIEW IF EXISTS public.admin_profiles_safe;

CREATE VIEW public.admin_profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
    p.user_id,
    p.id,
    p.display_name,
    p.avatar_url,
    p.store_name,
    p.country,
    p.subscription_tier,
    p.subscribed,
    p.subscription_end,
    p.created_at,
    p.updated_at,
    -- SECURITY: Email is always masked for admins
    (substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2)) as email_masked,
    ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id;

-- Fix security_audit_summary view
DROP VIEW IF EXISTS public.security_audit_summary;

CREATE VIEW public.security_audit_summary 
WITH (security_invoker = true)
AS
SELECT 
    event_type,
    target_table,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM public.security_audit_log
GROUP BY event_type, target_table;

-- Grant appropriate permissions
GRANT SELECT ON public.marketplace_content TO anon, authenticated;
GRANT SELECT ON public.admin_profiles_safe TO authenticated;
GRANT SELECT ON public.security_audit_summary TO authenticated;