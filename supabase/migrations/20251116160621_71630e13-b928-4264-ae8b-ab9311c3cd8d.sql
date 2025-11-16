-- Drop the restrictive RLS policy that only allows pending updates
DROP POLICY IF EXISTS "Creators can update their pending submissions" ON public.content_submissions;

-- Create new policy allowing creators to update their own submissions (any status)
CREATE POLICY "Creators can update their own submissions"
ON public.content_submissions
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = creator_id) AND 
  (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  (auth.uid() = creator_id) AND 
  (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);