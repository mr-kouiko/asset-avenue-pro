-- Create a view for marketplace content that automatically refreshes
-- This view will only show approved content that hasn't been deleted
CREATE OR REPLACE VIEW public.marketplace_content AS
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

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW public.marketplace_content SET (security_invoker = true);

-- Grant access to the view
GRANT SELECT ON public.marketplace_content TO anon, authenticated;