-- Create function to trigger email sending when new vendor signs up
CREATE OR REPLACE FUNCTION public.send_vendor_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_record RECORD;
    user_role_record RECORD;
BEGIN
    -- Get profile information
    SELECT display_name, store_name, email INTO profile_record
    FROM public.profiles 
    WHERE user_id = NEW.id;
    
    -- Get user role
    SELECT role INTO user_role_record
    FROM public.user_roles 
    WHERE user_id = NEW.id;
    
    -- Only send email if user is a creator/vendor
    IF user_role_record.role = 'creator' AND profile_record.email IS NOT NULL THEN
        -- Call the email edge function asynchronously
        PERFORM 
            net.http_post(
                url := 'https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/send-vendor-emails',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.jwt_secret', true)
                ),
                body := jsonb_build_object(
                    'userId', NEW.id::text,
                    'email', profile_record.email,
                    'displayName', COALESCE(profile_record.display_name, profile_record.email),
                    'storeName', profile_record.store_name,
                    'emailType', 'confirmation'
                )
            );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update the existing handle_new_user function to also handle creator role assignment and trigger emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Create trigger for new user email notifications (after profile and role are created)
DROP TRIGGER IF EXISTS send_vendor_email_trigger ON auth.users;
CREATE TRIGGER send_vendor_email_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.send_vendor_welcome_email();

-- Ensure the main user creation trigger still exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();