-- Add slug column to content_submissions for SEO-friendly URLs
ALTER TABLE content_submissions 
ADD COLUMN slug TEXT UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_content_submissions_slug ON content_submissions(slug);

-- Add comment explaining the column
COMMENT ON COLUMN content_submissions.slug IS 'SEO-friendly URL slug generated from title and tags';