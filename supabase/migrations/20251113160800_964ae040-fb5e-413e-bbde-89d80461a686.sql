-- Add original_language column to content_submissions
ALTER TABLE content_submissions 
ADD COLUMN IF NOT EXISTS original_language text DEFAULT 'en';

-- Update existing products to have English as default original language
UPDATE content_submissions 
SET original_language = 'en' 
WHERE original_language IS NULL;

-- Add index for better performance on language queries
CREATE INDEX IF NOT EXISTS idx_content_submissions_original_language 
ON content_submissions(original_language);

-- Add comment for documentation
COMMENT ON COLUMN content_submissions.original_language IS 'The original language of the product content (ISO 639-1 code)';