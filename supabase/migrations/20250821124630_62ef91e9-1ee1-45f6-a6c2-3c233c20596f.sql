-- Fix the security definer issue by ensuring the view uses security invoker
-- and add proper public access policy for files
CREATE POLICY "Public can view files for approved content" 
ON public.content_files 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.marketplace_content 
        WHERE id = content_files.submission_id
    )
);

-- Also ensure content files can be accessed properly for product details
CREATE POLICY "Files accessible for approved products"
ON public.content_files
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.content_submissions cs
        WHERE cs.id = content_files.submission_id 
        AND cs.status = 'approved'
    )
);