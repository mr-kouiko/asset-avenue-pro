-- First, delete duplicates keeping the highest priority role (admin > creator > client)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
AND a.user_id = b.user_id
AND (
  -- Keep admin over creator/client
  (b.role = 'admin' AND a.role IN ('creator', 'client'))
  OR
  -- Keep creator over client
  (b.role = 'creator' AND a.role = 'client')
  OR
  -- If same priority, keep the older one
  (a.role = b.role)
);

-- Now add unique constraint on user_id
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);