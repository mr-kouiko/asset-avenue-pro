-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Clients can view approved submissions" ON public.content_submissions;

-- Create a secure public view for marketplace content that doesn't expose sensitive creator data
CREATE OR REPLACE VIEW public.marketplace_content AS
SELECT 
    cs.id,
    cs.title,
    cs.description,
    cs.price,
    cs.tags,
    cs.created_at,
    cs.category_id,
    -- Use a hash or anonymous identifier instead of real creator_id
    encode(digest(cs.creator_id::text, 'sha256'), 'hex') as creator_hash,
    -- Get creator display info without exposing the actual user_id
    COALESCE(p.display_name, 'Créateur anonyme') as creator_display_name,
    COALESCE(p.store_name, '') as creator_store_name
FROM public.content_submissions cs
LEFT JOIN public.profiles p ON p.user_id = cs.creator_id
WHERE cs.status = 'approved';

-- Grant public access to the view
GRANT SELECT ON public.marketplace_content TO authenticated, anon;

-- Create RLS policy for the view (allow all to read since it's already filtered)
ALTER VIEW public.marketplace_content SET (security_invoker = true);

-- Create a secure function to get individual product details without exposing creator_id
CREATE OR REPLACE FUNCTION public.get_product_detail(product_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    price numeric,
    tags text[],
    created_at timestamptz,
    category_id uuid,
    creator_display_name text,
    creator_store_name text,
    category_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.get_product_detail(uuid) TO authenticated, anon;

-- Update the existing policies to be more restrictive for direct table access
-- Keep full access for creators to their own submissions
CREATE POLICY "Creators can view their own submissions" 
ON public.content_submissions 
FOR SELECT 
USING (
    auth.uid() = creator_id 
    AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Keep admin access
CREATE POLICY "Admins can view all submissions" 
ON public.content_submissions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
);

-- Add a policy for content_files to work with the new approach
CREATE POLICY "Public can view files for approved content" 
ON public.content_files 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.content_submissions 
        WHERE id = content_files.submission_id 
        AND status = 'approved'
    )
);