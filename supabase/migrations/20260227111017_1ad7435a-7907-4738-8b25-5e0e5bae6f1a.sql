
-- Delete product_translations for the duplicate Espace→Arabie Saoudite
DELETE FROM product_translations WHERE product_id = '7b606c3c-3d30-449a-a414-091ab8728222';

-- Delete content_files for both duplicates
DELETE FROM content_files WHERE submission_id IN ('286a1e00-2940-46bf-bd56-97fe86274911', '7b606c3c-3d30-449a-a414-091ab8728222');

-- Delete the duplicate submissions
DELETE FROM content_submissions WHERE id IN ('286a1e00-2940-46bf-bd56-97fe86274911', '7b606c3c-3d30-449a-a414-091ab8728222');
