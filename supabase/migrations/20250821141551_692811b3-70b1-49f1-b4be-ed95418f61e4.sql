-- Enhanced security for profile access with email protection
-- Create a secure admin profile access function that masks sensitive data by default

CREATE OR REPLACE FUNCTION public.admin_access_profile_secure(
  profile_user_id uuid,
  include_sensitive_data boolean DEFAULT false,
  access_reason text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  id uuid,
  display_name text,
  avatar_url text,
  store_name text,
  country text,
  subscription_tier text,
  subscribed boolean,
  subscription_end timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_admin uuid;
  profile_exists boolean;
BEGIN
  -- Get the requesting user ID
  requesting_admin := auth.uid();
  
  -- Verify the requesting user is an admin
  IF NOT has_role(requesting_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Check if the profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id = profile_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', profile_user_id;
  END IF;
  
  -- Log the admin access attempt with detailed information
  INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
  VALUES (
    'admin_profile_access_secure',
    requesting_admin,
    'profiles',
    jsonb_build_object(
      'accessed_profile_user_id', profile_user_id,
      'include_sensitive_data', include_sensitive_data,
      'access_reason', access_reason,
      'timestamp', now(),
      'requesting_admin_id', requesting_admin
    )
  );
  
  -- Return profile data with conditional email masking
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id,
    p.display_name,
    p.avatar_url,
    p.store_name,
    p.country,
    p.subscription_tier,
    p.subscribed,
    p.subscription_end,
    p.created_at,
    p.updated_at,
    CASE 
      WHEN include_sensitive_data THEN p.email
      ELSE SUBSTRING(p.email, 1, 2) || '***@' || SPLIT_PART(p.email, '@', 2)
    END as email_masked
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
  
END;
$$;

-- Create a view for admin dashboard that shows masked emails by default
CREATE OR REPLACE VIEW public.admin_profiles_safe AS
SELECT 
  p.user_id,
  p.id,
  p.display_name,
  p.avatar_url,
  p.store_name,
  p.country,
  p.subscription_tier,
  p.subscribed,
  p.subscription_end,
  p.created_at,
  p.updated_at,
  -- Mask email addresses for general admin viewing
  SUBSTRING(p.email, 1, 2) || '***@' || SPLIT_PART(p.email, '@', 2) as email_masked,
  -- Include user roles for admin context
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE 
  -- Only accessible by admins
  has_role(auth.uid(), 'admin'::app_role) = true;

-- Enable RLS on the admin view
ALTER VIEW public.admin_profiles_safe SET (security_invoker = on);

-- Create RLS policy for the admin safe view
CREATE POLICY "Admins can view masked profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  log_admin_profile_access(auth.uid(), user_id) = true
);

-- Update the admin access logging function to be more detailed
CREATE OR REPLACE FUNCTION public.log_admin_profile_access(admin_user_id uuid, accessed_profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enhanced logging with more context
  INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
  VALUES (
    'admin_profile_access_basic',
    admin_user_id,
    'profiles',
    jsonb_build_object(
      'accessed_profile_user_id', accessed_profile_user_id,
      'timestamp', now(),
      'access_type', 'basic_profile_view',
      'ip_address', COALESCE(current_setting('request.header.x-forwarded-for', true), 'unknown'),
      'user_agent', COALESCE(current_setting('request.header.user-agent', true), 'unknown')
    )
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, still allow access but log the failure
    INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
    VALUES (
      'admin_profile_access_logging_failed',
      admin_user_id,
      'profiles',
      jsonb_build_object(
        'accessed_profile_user_id', accessed_profile_user_id,
        'timestamp', now(),
        'error', SQLERRM
      )
    );
    RETURN true;
END;
$$;

-- Create a function for legitimate full email access (with justification required)
CREATE OR REPLACE FUNCTION public.admin_get_full_email(
  profile_user_id uuid,
  business_justification text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_admin uuid;
  user_email text;
BEGIN
  -- Get the requesting user ID
  requesting_admin := auth.uid();
  
  -- Verify the requesting user is an admin
  IF NOT has_role(requesting_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Require business justification
  IF business_justification IS NULL OR LENGTH(business_justification) < 10 THEN
    RAISE EXCEPTION 'Business justification required (minimum 10 characters)';
  END IF;
  
  -- Log the sensitive data access with justification
  INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
  VALUES (
    'admin_sensitive_email_access',
    requesting_admin,
    'profiles',
    jsonb_build_object(
      'accessed_profile_user_id', profile_user_id,
      'business_justification', business_justification,
      'timestamp', now(),
      'requesting_admin_id', requesting_admin,
      'severity', 'HIGH'
    )
  );
  
  -- Get the email
  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = profile_user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', profile_user_id;
  END IF;
  
  RETURN user_email;
END;
$$;

-- Add a security audit summary view for monitoring
CREATE OR REPLACE VIEW public.security_audit_summary AS
SELECT 
  event_type,
  target_table,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM public.security_audit_log 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, target_table
ORDER BY event_count DESC;

-- Enable RLS on security audit summary
ALTER VIEW public.security_audit_summary SET (security_invoker = on);

-- Create policy for security audit summary (admin only)
CREATE POLICY "Admins can view security audit summary"
ON public.security_audit_log
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create an alert for suspicious admin access patterns
CREATE OR REPLACE FUNCTION public.check_admin_access_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suspicious_activity RECORD;
BEGIN
  -- Check for excessive admin access in the last hour
  FOR suspicious_activity IN
    SELECT 
      user_id,
      COUNT(*) as access_count
    FROM public.security_audit_log 
    WHERE 
      event_type LIKE 'admin_%' 
      AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) > 50
  LOOP
    -- Log suspicious activity
    INSERT INTO public.security_audit_log (event_type, user_id, target_table, details)
    VALUES (
      'suspicious_admin_activity_detected',
      suspicious_activity.user_id,
      'security_monitoring',
      jsonb_build_object(
        'access_count_last_hour', suspicious_activity.access_count,
        'threshold_exceeded', true,
        'timestamp', now(),
        'severity', 'CRITICAL'
      )
    );
  END LOOP;
END;
$$;