
-- Tighten the detection_results INSERT policy to only allow service-level inserts
-- (creators can insert for their own submissions)
DROP POLICY IF EXISTS "detection_results_insert_service" ON public.detection_results;

CREATE POLICY "detection_results_insert_own"
ON public.detection_results FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.content_submissions cs
        WHERE cs.id = content_submission_id AND cs.creator_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
);
