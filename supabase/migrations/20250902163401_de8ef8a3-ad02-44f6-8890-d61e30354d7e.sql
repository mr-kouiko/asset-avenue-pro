-- Fix the marketplace_content view to properly categorize PDFs as documents/ebooks
CREATE OR REPLACE VIEW marketplace_content AS
SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.price,
    cs.tags,
    cs.created_at,
    cs.category_id,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM content_files cf
          WHERE cf.submission_id = cs.id AND cf.is_original = true AND cf.file_type LIKE 'video%')) THEN 'video'::text
        WHEN (EXISTS ( SELECT 1
           FROM content_files cf
          WHERE cf.submission_id = cs.id AND cf.is_original = true AND cf.file_type LIKE 'audio%')) THEN 'audio'::text
        WHEN (EXISTS ( SELECT 1
           FROM content_files cf
          WHERE cf.submission_id = cs.id AND cf.is_original = true AND (cf.file_type = 'document' OR cf.file_format = 'application/pdf'))) THEN 'document'::text
        WHEN (EXISTS ( SELECT 1
           FROM content_files cf
          WHERE cf.submission_id = cs.id AND cf.is_original = true AND (cf.file_type LIKE '%vector%' OR cf.file_format = 'svg'))) THEN 'illustration'::text
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
    AND EXISTS ( SELECT 1
       FROM content_files cf
      WHERE cf.submission_id = cs.id);