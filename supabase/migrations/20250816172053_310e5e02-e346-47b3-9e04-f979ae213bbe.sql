
-- 1) Remove insecure client insert on downloads
alter table public.downloads enable row level security;

drop policy if exists "Users can create downloads for approved content" on public.downloads;

-- Keep existing "Users can view their own downloads" policy as-is.
-- Optionally, ensure there is NO other INSERT policy so clients cannot insert rows directly.

-- 2) Harden handle_new_user: default to 'client' and ignore elevated roles in metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    user_meta jsonb;
    first_name_val text;
    last_name_val text;
    store_name_val text;
    country_val text;
begin
    -- Safely handle raw_user_meta_data
    user_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

    -- Extract values safely
    first_name_val := user_meta ->> 'first_name';
    last_name_val := user_meta ->> 'last_name';
    store_name_val := user_meta ->> 'store_name';
    country_val := user_meta ->> 'country';

    -- Insert into profiles table
    insert into public.profiles (
        user_id, 
        display_name, 
        store_name, 
        country,
        email
    )
    values (
        new.id, 
        case 
            when first_name_val is not null and last_name_val is not null 
            then first_name_val || ' ' || last_name_val
            else new.email
        end,
        store_name_val,
        country_val,
        new.email
    )
    on conflict (user_id) do nothing;

    -- Always assign 'client' for new users; elevated roles must be granted by admins later
    insert into public.user_roles (user_id, role)
    values (new.id, 'client'::app_role)
    on conflict do nothing;

    return new;
end;
$function$;

-- Note: By design we are NOT attaching a trigger to auth.users (reserved schema).
-- This function is now safe if ever used, but role assignment should be handled via controlled flows.

-- 3) Add audit trigger on user_roles
drop trigger if exists user_roles_role_audit_trg on public.user_roles;

create trigger user_roles_role_audit_trg
after insert or update on public.user_roles
for each row execute procedure public.log_role_change();

-- 4) Storage policies on storage.objects

-- Ensure RLS is enabled on storage.objects
alter table storage.objects enable row level security;

-- Private bucket: original-files
drop policy if exists "original-files owners rw" on storage.objects;
drop policy if exists "original-files admin read" on storage.objects;

create policy "original-files owners rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'original-files' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'original-files' and split_part(name, '/', 1) = auth.uid()::text);

create policy "original-files admin read"
on storage.objects
as permissive
for select
to authenticated
using (bucket_id = 'original-files' and public.has_role(auth.uid(), 'admin'::app_role));

-- Private bucket: seller-content
drop policy if exists "seller-content owners rw" on storage.objects;
drop policy if exists "seller-content admin read" on storage.objects;

create policy "seller-content owners rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'seller-content' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'seller-content' and split_part(name, '/', 1) = auth.uid()::text);

create policy "seller-content admin read"
on storage.objects
as permissive
for select
to authenticated
using (bucket_id = 'seller-content' and public.has_role(auth.uid(), 'admin'::app_role));

-- Public bucket: previews (public read; restrict writes to owner/admin)
drop policy if exists "previews public read" on storage.objects;
drop policy if exists "previews owners rw" on storage.objects;
drop policy if exists "previews admin rw" on storage.objects;

create policy "previews public read"
on storage.objects
as permissive
for select
to public
using (bucket_id = 'previews');

create policy "previews owners rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'previews' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'previews' and split_part(name, '/', 1) = auth.uid()::text);

create policy "previews admin rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'previews' and public.has_role(auth.uid(), 'admin'::app_role))
with check (bucket_id = 'previews' and public.has_role(auth.uid(), 'admin'::app_role));

-- Public bucket: thumbnails
drop policy if exists "thumbnails public read" on storage.objects;
drop policy if exists "thumbnails owners rw" on storage.objects;
drop policy if exists "thumbnails admin rw" on storage.objects;

create policy "thumbnails public read"
on storage.objects
as permissive
for select
to public
using (bucket_id = 'thumbnails');

create policy "thumbnails owners rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'thumbnails' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'thumbnails' and split_part(name, '/', 1) = auth.uid()::text);

create policy "thumbnails admin rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'thumbnails' and public.has_role(auth.uid(), 'admin'::app_role))
with check (bucket_id = 'thumbnails' and public.has_role(auth.uid(), 'admin'::app_role));

-- Public bucket: user-avatars
drop policy if exists "user-avatars public read" on storage.objects;
drop policy if exists "user-avatars owners rw" on storage.objects;
drop policy if exists "user-avatars admin rw" on storage.objects;

create policy "user-avatars public read"
on storage.objects
as permissive
for select
to public
using (bucket_id = 'user-avatars');

create policy "user-avatars owners rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'user-avatars' and split_part(name, '/', 1) = auth.uid()::text)
with check (bucket_id = 'user-avatars' and split_part(name, '/', 1) = auth.uid()::text);

create policy "user-avatars admin rw"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'user-avatars' and public.has_role(auth.uid(), 'admin'::app_role))
with check (bucket_id = 'user-avatars' and public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Remove insecure/unused SQL function
drop function if exists public.generate_secure_download_url(uuid, uuid);
