-- 1. Fix admin account setup safely
-- Delete any duplicate roles first
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'kouiko@gmail.com'
) AND role != 'admin'::app_role;

-- Ensure kouiko@gmail.com is admin
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'kouiko@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create test seller account safely
INSERT INTO public.profiles (
  user_id, 
  email, 
  display_name, 
  store_name, 
  country
) 
SELECT 
  gen_random_uuid(),
  'seller@example.com',
  'Test Seller',
  'Test Store',
  'fr'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'seller@example.com'
);

-- Add creator role for test seller
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'creator'::app_role
FROM public.profiles p
WHERE p.email = 'seller@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Create test buyer account safely
INSERT INTO public.profiles (
  user_id,
  email,
  display_name,
  country
) 
SELECT 
  gen_random_uuid(),
  'buyer@example.com', 
  'Test Buyer',
  'fr'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'buyer@example.com'
);

-- Add client role for test buyer
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'client'::app_role
FROM public.profiles p
WHERE p.email = 'buyer@example.com'
ON CONFLICT (user_id, role) DO NOTHING;