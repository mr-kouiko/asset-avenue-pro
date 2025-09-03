-- Fix Security Definer Views issue by recreating views without SECURITY DEFINER
-- and ensuring they work properly with RLS policies

-- Drop existing views that might have SECURITY DEFINER behavior
DROP VIEW IF EXISTS admin_profiles_safe;
DROP VIEW IF EXISTS creator_profiles_public; 
DROP VIEW IF EXISTS marketplace_content;
DROP VIEW IF EXISTS public_file_access;
DROP VIEW IF EXISTS security_audit_summary;

-- Recreate admin_profiles_safe as a regular view
CREATE VIEW admin_profiles_safe AS
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
    -- Email is always masked for security
    (substring(p.email, 1, 2) || '***@' || split_part(p.email, '@', 2)) as email_masked,
    ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id;

-- Enable RLS on the view
ALTER VIEW admin_profiles_safe ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "admin_profiles_safe_policy" ON admin_profiles_safe
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate creator_profiles_public as a regular view
CREATE VIEW creator_profiles_public AS
SELECT 
    p.user_id,
    p.display_name,
    p.store_name,
    p.avatar_url,
    encode(digest(p.user_id::text, 'sha256'), 'hex') as creator_hash
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'creator'::app_role
AND EXISTS (
    SELECT 1 FROM content_submissions cs 
    WHERE cs.creator_id = p.user_id 
    AND cs.status = 'approved'
);

-- Recreate marketplace_content as a regular view
CREATE VIEW marketplace_content AS
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
    encode(digest(cs.creator_id::text, 'sha256'), 'hex') AS creator_hash,
    c.name AS category_name
FROM content_submissions cs
LEFT JOIN profiles p ON p.user_id = cs.creator_id
LEFT JOIN categories c ON c.id = cs.category_id
WHERE cs.status = 'approved' 
AND EXISTS (SELECT 1 FROM content_files cf WHERE cf.submission_id = cs.id);

-- Recreate public_file_access as a regular view  
CREATE VIEW public_file_access AS
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

-- Recreate security_audit_summary as a regular view
CREATE VIEW security_audit_summary AS
SELECT 
    event_type,
    target_table,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM security_audit_log
GROUP BY event_type, target_table;