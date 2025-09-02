-- Fix permissions for marketplace_content view to work with profiles table
-- Add policy to allow public access to creator profile information for approved content

CREATE POLICY "Public can view creator profiles for approved content" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM content_submissions cs
    WHERE cs.creator_id = profiles.user_id 
    AND cs.status = 'approved'
  )
);

-- Update the query to also include file_name in content_files
UPDATE content_files 
SET file_name = 'PAINT RAIDER.pdf' 
WHERE submission_id = (
  SELECT id FROM content_submissions 
  WHERE title = 'PAINT RAIDER: Danger Hides Within the Canvas'
) AND file_name IS NULL;