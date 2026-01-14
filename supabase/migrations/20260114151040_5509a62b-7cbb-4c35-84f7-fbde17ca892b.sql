-- First update any content submissions that reference the Illustration category to use Photo instead
UPDATE content_submissions 
SET category_id = (SELECT id FROM categories WHERE slug = 'photo')
WHERE category_id = '653f8437-6317-4a81-8bbf-9b8c520c0dbe';

-- Now we can safely delete the Illustration category
DELETE FROM categories WHERE slug = 'illustration';