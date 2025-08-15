-- Fix the handle_new_user function to match the actual profiles table structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table with correct column names
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    store_name, 
    country,
    email
  )
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name' || ' ' || NEW.raw_user_meta_data ->> 'last_name',
      NEW.email
    ),
    NEW.raw_user_meta_data ->> 'store_name',
    NEW.raw_user_meta_data ->> 'country',
    NEW.email
  );
  
  -- Assign role based on metadata or default to client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'client')
  );
  
  RETURN NEW;
END;
$$;