-- Add policy to allow service role to insert download records for logging
CREATE POLICY "service_role_can_log_downloads" 
ON public.downloads 
FOR INSERT 
WITH CHECK (true);