-- Fix Security Definer Views by replacing them with secure functions
-- Use alternative hashing method

-- Drop all views to eliminate SECURITY DEFINER issues
DROP VIEW IF EXISTS admin_profiles_safe;
DROP VIEW IF EXISTS creator_profiles_public; 
DROP VIEW IF EXISTS marketplace_content;
DROP VIEW IF EXISTS public_file_access;
DROP VIEW IF EXISTS security_audit_summary;

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
        -- Use simple hash alternative instead of digest function
        md5(p.user_id::text) as creator_hash
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
        md5(cs.creator_id::text) AS creator_hash,
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