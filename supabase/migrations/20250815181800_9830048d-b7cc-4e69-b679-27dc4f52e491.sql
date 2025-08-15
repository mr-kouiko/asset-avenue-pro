-- Drop the existing trigger and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fix the handle_new_user function with proper null handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table with correct column names and null handling
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
      WHEN NEW.raw_user_meta_data IS NOT NULL AND 
           NEW.raw_user_meta_data ->> 'first_name' IS NOT NULL AND 
           NEW.raw_user_meta_data ->> 'last_name' IS NOT NULL 
      THEN NEW.raw_user_meta_data ->> 'first_name' || ' ' || NEW.raw_user_meta_data ->> 'last_name'
      ELSE NEW.email
    END,
    CASE 
      WHEN NEW.raw_user_meta_data IS NOT NULL 
      THEN NEW.raw_user_meta_data ->> 'store_name'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data IS NOT NULL 
      THEN NEW.raw_user_meta_data ->> 'country'
      ELSE NULL
    END,
    NEW.email
  );
  
  -- Assign role based on metadata or default to client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data IS NOT NULL AND 
           NEW.raw_user_meta_data ->> 'role' IS NOT NULL
      THEN (NEW.raw_user_meta_data ->> 'role')::app_role
      ELSE 'client'::app_role
    END
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger to call the function when a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();