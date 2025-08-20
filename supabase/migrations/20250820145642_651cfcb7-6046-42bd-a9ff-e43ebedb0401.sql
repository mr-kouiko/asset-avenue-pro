-- Fix the log_role_change function to handle null auth.uid() during signup
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit (user_id, new_role, changed_by)
    VALUES (NEW.user_id, NEW.role, COALESCE(auth.uid(), NEW.user_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, COALESCE(auth.uid(), NEW.user_id));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;