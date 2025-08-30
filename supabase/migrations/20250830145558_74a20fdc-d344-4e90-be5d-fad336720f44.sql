-- Add RLS policy to allow public access to content_files metadata for approved submissions
CREATE POLICY "Public can view file metadata for approved submissions" 
ON public.content_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM content_submissions cs 
    WHERE cs.id = content_files.submission_id 
    AND cs.status = 'approved'
  )
);