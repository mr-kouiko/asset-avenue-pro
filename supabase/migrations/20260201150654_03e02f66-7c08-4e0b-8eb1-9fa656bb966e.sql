
-- Add DELETE policy for admins to delete any submissions
CREATE POLICY "Admins can delete any submissions"
ON public.content_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);
