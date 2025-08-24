-- Fix platform_settings RLS policy to be more restrictive

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role only access to platform settings" ON public.platform_settings;

-- Create more restricted policies
-- Service role can read for edge function operations
CREATE POLICY "Service role read access for operations"
ON public.platform_settings
FOR SELECT
TO service_role
USING (true);

-- Only service role can update settings (not full access)
CREATE POLICY "Service role update for edge functions"
ON public.platform_settings  
FOR UPDATE
TO service_role
USING (true);

-- Prevent service role from inserting or deleting (only read/update for operations)
-- Admin users can view commission settings only (not secrets)
-- No INSERT or DELETE for anyone except through migrations

-- Add RLS policies for the identified views/tables
-- Note: These may be views, so we'll try to secure what we can

-- Check if admin_profiles_safe is a table or view and secure it
DO $$
BEGIN
    -- Try to add RLS to admin_profiles_safe if it's a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_profiles_safe'
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.admin_profiles_safe ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admins only access to admin profiles"
        ON public.admin_profiles_safe
        FOR ALL
        TO authenticated
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
    
    -- Try to add RLS to marketplace_content if it's a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'marketplace_content'
        AND table_type = 'BASE TABLE'  
    ) THEN
        ALTER TABLE public.marketplace_content ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Public read access to marketplace content"
        ON public.marketplace_content
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
    
    -- Try to add RLS to security_audit_summary if it's a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'security_audit_summary'
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.security_audit_summary ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admins only access to security audit summary"
        ON public.security_audit_summary
        FOR ALL
        TO authenticated
        USING (has_role(auth.uid(), 'admin'::app_role));
    END IF;
    
    -- Try to add RLS to public_file_access if it's a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'public_file_access'
        AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.public_file_access ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Public read access to file access"
        ON public.public_file_access
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;