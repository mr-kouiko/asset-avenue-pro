-- Fix function search path security issues
-- Update all functions to have explicit search_path

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_vendor_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only log if this is a creator/vendor registration
    IF (NEW.raw_user_meta_data ->> 'role') = 'creator' THEN
        -- Insert a log entry that can be processed later
        INSERT INTO public.profiles (
            user_id, 
            display_name, 
            store_name, 
            country,
            email
        )
        VALUES (
            NEW.id, 
            CASE 
                WHEN (NEW.raw_user_meta_data ->> 'first_name') IS NOT NULL AND (NEW.raw_user_meta_data ->> 'last_name') IS NOT NULL 
                THEN (NEW.raw_user_meta_data ->> 'first_name') || ' ' || (NEW.raw_user_meta_data ->> 'last_name')
                ELSE NEW.email
            END,
            NEW.raw_user_meta_data ->> 'store_name',
            NEW.raw_user_meta_data ->> 'country',
            NEW.email
        )
        ON CONFLICT (user_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            store_name = EXCLUDED.store_name,
            country = EXCLUDED.country,
            email = EXCLUDED.email;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_creator_public_info(creator_ids uuid[])
 RETURNS TABLE(user_id uuid, display_name text, store_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.user_id,
        p.display_name,
        p.store_name,
        p.avatar_url
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = ANY(creator_ids)
    AND ur.role = 'creator'
    AND EXISTS (
        SELECT 1 
        FROM public.content_submissions cs 
        WHERE cs.creator_id = p.user_id 
        AND cs.status = 'approved'
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_product_detail(product_id uuid)
 RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, creator_display_name text, creator_store_name text, category_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.description,
        cs.price,
        cs.tags,
        cs.created_at,
        cs.category_id,
        COALESCE(p.display_name, 'Créateur anonyme') as creator_display_name,
        COALESCE(p.store_name, '') as creator_store_name,
        COALESCE(c.name, '') as category_name
    FROM public.content_submissions cs
    LEFT JOIN public.profiles p ON p.user_id = cs.creator_id  
    LEFT JOIN public.categories c ON c.id = cs.category_id
    WHERE cs.id = product_id 
    AND cs.status = 'approved';
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_profile_access(admin_user_id uuid, accessed_profile_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_profile(profile_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only the profile owner or admin can access full profile data including emails
  RETURN (
    auth.uid() = profile_user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_admin_access_patterns()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_meta jsonb;
    first_name_val text;
    last_name_val text;
    store_name_val text;
    country_val text;
    role_val text;
BEGIN
    -- Safely handle raw_user_meta_data
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';
    role_val := user_meta ->> 'role';
    
    -- Insert into profiles table
    INSERT INTO public.profiles (
        user_id, 
        display_name, 
        store_name, 
        country,
        email
    )
    VALUES (
        NEW.id, 
        CASE 
            WHEN first_name_val IS NOT NULL AND last_name_val IS NOT NULL 
            THEN first_name_val || ' ' || last_name_val
            ELSE NEW.email
        END,
        store_name_val,
        country_val,
        NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign role based on metadata or default to creator for dashboard users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        CASE 
            WHEN role_val = 'creator' THEN 'creator'::app_role
            WHEN role_val = 'admin' THEN 'admin'::app_role
            WHEN role_val = 'client' THEN 'client'::app_role
            -- Default to creator for users accessing the dashboard
            ELSE 'creator'::app_role
        END
    )
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$;