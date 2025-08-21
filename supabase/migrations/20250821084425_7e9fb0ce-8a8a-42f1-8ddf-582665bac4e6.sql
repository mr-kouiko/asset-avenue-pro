-- Fix the vendor welcome email function by removing dependency first
-- Drop the existing trigger first
DROP TRIGGER IF EXISTS send_vendor_email_trigger ON auth.users;

-- Drop the existing function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.send_vendor_welcome_email() CASCADE;

-- Create a simplified trigger function that just logs vendor registrations
-- We'll handle email sending via edge functions called from the frontend instead
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

-- Create trigger for new vendor registrations
CREATE TRIGGER log_vendor_registration_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.log_vendor_registration();