-- Fix Security Definer Views by replacing them with secure functions
-- First enable required extensions

-- Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop all views to eliminate SECURITY DEFINER issues
DROP VIEW IF EXISTS admin_profiles_safe;
DROP VIEW IF EXISTS creator_profiles_public; 
DROP VIEW IF EXISTS marketplace_content;
DROP VIEW IF EXISTS public_file_access;
DROP VIEW IF EXISTS security_audit_summary;

-- Create secure function to replace admin_profiles_safe view
CREATE OR REPLACE FUNCTION get_admin_profiles_safe()
RETURNS TABLE (
    user_id uuid,
    id uuid,
    display_name text,
    avatar_url text,
    store_name text,
    country text,
    subscription_tier text,
    subscribed boolean,
    subscription_end timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email_masked text,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin access
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Return profiles with masked emails
    RETURN QUERY
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
        (substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2))::text as email_masked,
        ur.role
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.user_id;
END;
$$;

-- Create function to replace creator_profiles_public view
CREATE OR REPLACE FUNCTION get_creator_profiles_public()
RETURNS TABLE (
    user_id uuid,
    display_name text,
    store_name text,
    avatar_url text,
    creator_hash text
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
    SELECT 
        p.user_id,
        p.display_name,
        p.store_name,
        p.avatar_url,
        encode(digest(p.user_id::text, 'sha256'::text), 'hex'::text) as creator_hash
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'creator'::app_role
    AND EXISTS (
        SELECT 1 FROM content_submissions cs 
        WHERE cs.creator_id = p.user_id 
        AND cs.status = 'approved'
    );
$$;

-- Create function to replace marketplace_content view
CREATE OR REPLACE FUNCTION get_marketplace_content()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    price numeric,
    tags text[],
    created_at timestamp with time zone,
    category_id uuid,
    content_type text,
    creator_display_name text,
    creator_store_name text,
    creator_hash text,
    category_name text
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
    SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.price,
        cs.tags,
        cs.created_at,
        cs.category_id,
        CASE
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND cf.file_type LIKE 'video%') THEN 'video'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND cf.file_type LIKE 'audio%') THEN 'audio'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND (cf.file_type = 'document' OR cf.file_format = 'application/pdf')) THEN 'document'::text
            WHEN EXISTS (SELECT 1 FROM content_files cf 
                        WHERE cf.submission_id = cs.id 
                        AND cf.is_original = true 
                        AND (cf.file_type LIKE '%vector%' OR cf.file_format = 'svg')) THEN 'illustration'::text
            ELSE 'photo'::text
        END AS content_type,
        p.display_name AS creator_display_name,
        p.store_name AS creator_store_name,
        encode(digest(cs.creator_id::text, 'sha256'::text), 'hex'::text) AS creator_hash,
        c.name AS category_name
    FROM content_submissions cs
    LEFT JOIN profiles p ON p.user_id = cs.creator_id
    LEFT JOIN categories c ON c.id = cs.category_id
    WHERE cs.status = 'approved' 
    AND EXISTS (SELECT 1 FROM content_files cf WHERE cf.submission_id = cs.id);
$$;

-- Create function to replace public_file_access view
CREATE OR REPLACE FUNCTION get_public_file_access()
RETURNS TABLE (
    id uuid,
    content_id uuid,
    file_name text,
    file_type text,
    file_format text,
    file_size bigint,
    metadata jsonb,
    is_preview boolean,
    has_thumbnail boolean,
    public_file_url text
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
    SELECT 
        cf.id,
        cf.submission_id as content_id,
        cf.file_name,
        cf.file_type,
        cf.file_format,
        cf.file_size,
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
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cs.status = 'approved'
    AND (cf.is_preview = true OR cf.thumbnail_path IS NOT NULL);
$$;

-- Create function to replace security_audit_summary view
CREATE OR REPLACE FUNCTION get_security_audit_summary()
RETURNS TABLE (
    event_type text,
    target_table text,
    event_count bigint,
    unique_users bigint,
    first_occurrence timestamp with time zone,
    last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin access
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        sal.event_type,
        sal.target_table,
        COUNT(*)::bigint as event_count,
        COUNT(DISTINCT sal.user_id)::bigint as unique_users,
        MIN(sal.created_at) as first_occurrence,
        MAX(sal.created_at) as last_occurrence
    FROM security_audit_log sal
    GROUP BY sal.event_type, sal.target_table;
END;
$$;