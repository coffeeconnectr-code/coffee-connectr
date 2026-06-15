-- Run in Supabase SQL Editor AFTER profiles.sql and member_access_lock.sql
-- Lets business profiles add multiple named locations, each with its own map pin.

create table if not exists public.profile_sites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade not null,
  site_name text not null check (char_length(trim(site_name)) > 0),
  location text,
  latitude double precision,
  longitude double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_sites_profile_id_idx
on public.profile_sites (profile_id);

alter table public.profile_sites enable row level security;

drop policy if exists "Members can view profile sites" on public.profile_sites;
create policy "Members can view profile sites"
on public.profile_sites
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_sites.profile_id
      and not p.is_hidden
      and not p.is_suspended
      and public.has_active_member_access(p.user_id)
      and (
        auth.uid() = p.user_id
        or public.is_current_user_admin()
        or public.has_active_member_access(auth.uid())
      )
  )
);

drop policy if exists "Users can insert own profile sites" on public.profile_sites;
create policy "Users can insert own profile sites"
on public.profile_sites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own profile sites" on public.profile_sites;
create policy "Users can update own profile sites"
on public.profile_sites
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own profile sites" on public.profile_sites;
create policy "Users can delete own profile sites"
on public.profile_sites
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_id
      and profiles.user_id = auth.uid()
  )
);

-- Include business site pins in the public homepage / preview map.
create or replace function public.get_public_map_pins(
  p_category text default '',
  p_profile_type text default ''
)
returns table (
  latitude double precision,
  longitude double precision,
  primary_category text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.latitude,
    p.longitude,
    p.primary_category
  from public.profiles p
  where
    p.profile_type = 'individual'
    and p.latitude is not null
    and p.longitude is not null
    and not p.is_hidden
    and not p.is_suspended
    and public.has_active_member_access(p.user_id)
    and (
      p_category = ''
      or p.primary_category = p_category
      or p_category = any (p.secondary_categories)
    )
    and (
      p_profile_type = ''
      or p.profile_type = p_profile_type
    )

  union all

  select
    ps.latitude,
    ps.longitude,
    p.primary_category
  from public.profile_sites ps
  join public.profiles p on p.id = ps.profile_id
  where
    p.profile_type = 'business'
    and ps.latitude is not null
    and ps.longitude is not null
    and not p.is_hidden
    and not p.is_suspended
    and public.has_active_member_access(p.user_id)
    and (
      p_category = ''
      or p.primary_category = p_category
      or p_category = any (p.secondary_categories)
    )
    and (
      p_profile_type = ''
      or p.profile_type = p_profile_type
    );
$$;

revoke all on function public.get_public_map_pins(text, text) from public;
grant execute on function public.get_public_map_pins(text, text) to anon;
grant execute on function public.get_public_map_pins(text, text) to authenticated;
