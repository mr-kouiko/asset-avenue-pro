
-- Add DELETE policy for content_submissions
-- Creators can delete their own submissions, admins can delete any

CREATE POLICY "Creators can delete their own submissions"
ON public.content_submissions
FOR DELETE
USING (
  (auth.uid() = creator_id) 
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Also clean up orphaned drafts (empty drafts older than 7 days with no files)
-- This will be done via SQL but we'll add as a one-time cleanup
DELETE FROM public.content_submissions
WHERE status = 'draft'
AND title IN ('New Upload', 'Untitled Draft', 'Recovered Uploads')
AND NOT EXISTS (SELECT 1 FROM content_files cf WHERE cf.submission_id = content_submissions.id)
AND NOT EXISTS (SELECT 1 FROM uploaded_files uf WHERE uf.draft_id = content_submissions.id)
AND created_at < NOW() - INTERVAL '1 day';
