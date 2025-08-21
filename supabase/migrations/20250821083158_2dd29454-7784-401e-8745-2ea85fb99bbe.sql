-- Fix RLS policies for profiles table - handle existing policies properly

-- Check and drop any overly permissive policies that might exist  
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create security definer function to check admin status (if not exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update auth config to enable leaked password protection
-- Note: This might not be available in all Supabase versions
-- UPDATE auth.config SET leaked_password_protection = true WHERE true;