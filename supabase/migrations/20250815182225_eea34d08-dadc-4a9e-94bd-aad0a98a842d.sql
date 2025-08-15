-- Fix the handle_new_user function to handle null/empty raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_meta jsonb;
    first_name_val text;
    last_name_val text;
    role_val text;
    store_name_val text;
    country_val text;
BEGIN
    -- Safely handle raw_user_meta_data
    user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    role_val := user_meta ->> 'role';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';
    
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
    );
    
    -- Assign role based on metadata or default to client
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        CASE 
            WHEN role_val = 'seller' THEN 'seller'::app_role
            WHEN role_val = 'client' THEN 'client'::app_role
            ELSE 'client'::app_role
        END
    );
    
    RETURN NEW;
END;
$$;

-- Create storage buckets for seller content
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('seller-content', 'seller-content', true),
    ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for seller content uploads
CREATE POLICY "Sellers can upload content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'seller-content' AND 
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'seller'
    )
);

CREATE POLICY "Everyone can view seller content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-content');

CREATE POLICY "Sellers can update their own content" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'seller-content' AND 
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'seller'
    )
);

CREATE POLICY "Sellers can delete their own content" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'seller-content' AND 
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'seller'
    )
);

-- User avatars policies
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'user-avatars' AND 
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Everyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'user-avatars' AND 
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'user-avatars' AND 
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1]
);