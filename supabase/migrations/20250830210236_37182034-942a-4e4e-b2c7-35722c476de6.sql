-- Fix critical security vulnerability: Views exposing user data without RLS policies

-- Enable RLS on admin_profiles_safe view
ALTER TABLE public.admin_profiles_safe ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public_creator_profiles view  
ALTER TABLE public.public_creator_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_profiles_safe - only admins can access
CREATE POLICY "Admin only access to admin profiles safe view" 
ON public.admin_profiles_safe 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for public_creator_profiles - authenticated users can view creator profiles
CREATE POLICY "Authenticated users can view creator profiles" 
ON public.public_creator_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Log this security fix
SELECT log_security_event(
  'critical_security_fix_applied',
  jsonb_build_object(
    'issue', 'views_without_rls_policies',
    'tables_fixed', ARRAY['admin_profiles_safe', 'public_creator_profiles'],
    'severity', 'CRITICAL',
    'description', 'Added RLS policies to views that were exposing user data publicly'
  )
);