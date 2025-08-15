-- Add DELETE policy for profiles table to allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add admin policies for profile management (admins need to manage user profiles for support)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
);

-- Add policy to allow admins to update user roles (needed for admin functions)
CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur2 
        WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'::app_role
    )
);