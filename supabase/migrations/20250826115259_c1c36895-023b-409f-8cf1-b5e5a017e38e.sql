-- Security Fix 1: Lock down direct access to sensitive views
-- REVOKE SELECT on admin_profiles_safe from anon and authenticated roles
REVOKE SELECT ON public.admin_profiles_safe FROM anon;
REVOKE SELECT ON public.admin_profiles_safe FROM authenticated;

-- REVOKE SELECT on security_audit_summary from anon and authenticated roles  
REVOKE SELECT ON public.security_audit_summary FROM anon;
REVOKE SELECT ON public.security_audit_summary FROM authenticated;

-- Recreate admin_profiles_safe view with security_barrier
DROP VIEW IF EXISTS public.admin_profiles_safe;
CREATE VIEW public.admin_profiles_safe WITH (security_barrier=true) AS
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
    -- SECURITY: Email is always masked in the view
    (substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2)) as email_masked,
    ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id;

-- Recreate security_audit_summary view with security_barrier
DROP VIEW IF EXISTS public.security_audit_summary;
CREATE VIEW public.security_audit_summary WITH (security_barrier=true) AS
SELECT 
    event_type,
    target_table,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM public.security_audit_log 
GROUP BY event_type, target_table
ORDER BY event_count DESC;

-- Security Fix 2: Create secure admin RPC for dashboard stats
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS TABLE(
    total_users bigint,
    total_submissions bigint,
    pending_submissions bigint,
    approved_submissions bigint,
    rejected_submissions bigint,
    total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Strict admin verification
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Log admin access for audit
    INSERT INTO public.security_audit_log (
        event_type,
        user_id,
        target_table,
        details
    ) VALUES (
        'admin_dashboard_stats_access',
        auth.uid(),
        'dashboard_stats',
        jsonb_build_object(
            'access_method', 'secure_rpc',
            'timestamp', now(),
            'ip_address', coalesce(current_setting('request.header.x-forwarded-for', true), 'unknown')
        )
    );
    
    -- Return aggregated stats (no PII exposed)
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.profiles)::bigint as total_users,
        (SELECT COUNT(*) FROM public.content_submissions)::bigint as total_submissions,
        (SELECT COUNT(*) FROM public.content_submissions WHERE status = 'pending')::bigint as pending_submissions,
        (SELECT COUNT(*) FROM public.content_submissions WHERE status = 'approved')::bigint as approved_submissions,
        (SELECT COUNT(*) FROM public.content_submissions WHERE status = 'rejected')::bigint as rejected_submissions,
        (SELECT COALESCE(SUM(amount_total::numeric / 100), 0) FROM public.transactions WHERE status = 'completed')::numeric as total_revenue;
END;
$$;

-- Security Fix 3: Create secure admin RPC for security audit summary
CREATE OR REPLACE FUNCTION public.get_security_audit_summary_admin()
RETURNS TABLE(
    event_type text,
    target_table text,
    event_count bigint,
    unique_users bigint,
    first_occurrence timestamp with time zone,
    last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Strict admin verification
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Log admin access for audit
    INSERT INTO public.security_audit_log (
        event_type,
        user_id,
        target_table,
        details
    ) VALUES (
        'admin_security_audit_access',
        auth.uid(),
        'security_audit_summary',
        jsonb_build_object(
            'access_method', 'secure_rpc',
            'timestamp', now(),
            'ip_address', coalesce(current_setting('request.header.x-forwarded-for', true), 'unknown')
        )
    );
    
    -- Return security audit summary
    RETURN QUERY
    SELECT * FROM public.security_audit_summary;
END;
$$;

-- Security Fix 4: Review public views for data hygiene
-- Recreate marketplace_content view to ensure only approved content is exposed
DROP VIEW IF EXISTS public.marketplace_content;
CREATE VIEW public.marketplace_content AS
SELECT 
    cs.id,
    cs.created_at,
    cs.category_id,
    cs.title,
    cs.description,
    CASE 
        WHEN cs.price IS NULL THEN 'free'
        WHEN cs.price < 10 THEN 'low'
        WHEN cs.price < 50 THEN 'medium'
        ELSE 'high'
    END as price_range,
    cs.tags,
    -- Creator info is hashed for privacy
    encode(digest(cs.creator_id::text, 'sha256'), 'hex') as creator_hash,
    COALESCE(p.display_name, 'Anonymous Creator') as creator_display_name,
    COALESCE(p.store_name, '') as creator_store_name
FROM public.content_submissions cs
LEFT JOIN public.profiles p ON p.user_id = cs.creator_id
-- SECURITY: Only approved content is exposed
WHERE cs.status = 'approved';

-- Recreate public_file_access view with minimal metadata exposure
DROP VIEW IF EXISTS public.public_file_access;
CREATE VIEW public.public_file_access AS
SELECT 
    cf.id,
    cf.submission_id as content_id,
    cf.file_name,
    cf.file_type,
    cf.file_format,
    cf.file_size,
    -- SECURITY: Only expose safe metadata fields
    jsonb_build_object(
        'width', cf.metadata->>'width',
        'height', cf.metadata->>'height',
        'duration', cf.metadata->>'duration'
    ) as metadata,
    cf.is_preview,
    (cf.thumbnail_path IS NOT NULL) as has_thumbnail,
    CASE 
        WHEN cf.is_preview = true AND cf.preview_path IS NOT NULL THEN cf.preview_path
        WHEN cf.thumbnail_path IS NOT NULL THEN cf.thumbnail_path
        ELSE NULL
    END as public_file_url
FROM public.content_files cf
JOIN public.content_submissions cs ON cs.id = cf.submission_id
-- SECURITY: Only files from approved submissions
WHERE cs.status = 'approved' 
AND (cf.is_preview = true OR cf.thumbnail_path IS NOT NULL);

-- Recreate public_creator_profiles view with minimal exposure
DROP VIEW IF EXISTS public.public_creator_profiles;
CREATE VIEW public.public_creator_profiles AS
SELECT 
    p.user_id,
    p.display_name,
    p.store_name,
    p.avatar_url,
    -- Hash user_id for privacy while maintaining uniqueness
    encode(digest(p.user_id::text, 'sha256'), 'hex') as creator_hash
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
-- SECURITY: Only creators with approved content
WHERE ur.role = 'creator' 
AND EXISTS (
    SELECT 1 
    FROM public.content_submissions cs 
    WHERE cs.creator_id = p.user_id 
    AND cs.status = 'approved'
);

-- Log this critical security fix
INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_table,
    details
) VALUES (
    'CRITICAL_security_hardening_applied',
    auth.uid(),
    'multiple_tables_and_views',
    jsonb_build_object(
        'fixes_applied', ARRAY[
            'revoked_direct_view_access',
            'added_security_barriers',
            'created_secure_admin_rpcs',
            'hardened_public_views'
        ],
        'timestamp', now(),
        'security_level', 'CRITICAL'
    )
);