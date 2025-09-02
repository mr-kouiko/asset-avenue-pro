-- Function to ensure user has creator role when uploading content
CREATE OR REPLACE FUNCTION public.ensure_creator_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has creator or admin role
  IF NOT (has_role(NEW.creator_id, 'creator'::app_role) OR has_role(NEW.creator_id, 'admin'::app_role)) THEN
    -- Auto-upgrade user to creator role if they don't have it
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.creator_id, 'creator'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'creator'::app_role
    WHERE user_roles.role = 'client'::app_role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign creator role when uploading content
CREATE TRIGGER ensure_creator_role_trigger
BEFORE INSERT ON public.content_submissions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_creator_role();