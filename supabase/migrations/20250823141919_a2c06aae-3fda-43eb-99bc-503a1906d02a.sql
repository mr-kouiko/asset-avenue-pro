-- Fix search_path for existing functions to address security warning
-- Update the has_role function to set search_path
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role app_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;