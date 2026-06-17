-- Require complete profiles before they appear in Discover, maps, or member browsing.
-- Run in Supabase SQL Editor after profiles.sql and member_access_lock.sql.
--
-- Roasting equipment fields stay optional. Completion is set by the app on profile save.

alter table public.profiles
add column if not exists is_profile_complete boolean not null default false;

-- ---------------------------------------------------------------------------
-- 1. Members only see complete profiles (except their own and admins)
-- ---------------------------------------------------------------------------

drop policy if exists "Members can browse active profiles" on public.profiles;

create policy "Members can browse active profiles"
on public.profiles
for select
to authenticated
using (
  not is_hidden
  and not is_suspended
  and public.has_active_member_access(user_id)
  and (
    auth.uid() = user_id
    or public.is_current_user_admin()
    or (
      public.has_active_member_access(auth.uid())
      and is_profile_complete
    )
  )
);

-- ---------------------------------------------------------------------------
-- 2. Map pins only for complete profiles
-- ---------------------------------------------------------------------------

drop function if exists public.get_public_map_pins(text, text);

create or replace function public.get_public_map_pins(
  p_category text default '',
  p_profile_type text default ''
)
returns table (
  latitude double precision,
  longitude double precision,
  primary_category text,
  is_featured boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.latitude,
    p.longitude,
    p.primary_category,
    p.is_featured
  from public.profiles p
  where
    p.profile_type = 'individual'
    and p.is_profile_complete
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
    p.primary_category,
    p.is_featured
  from public.profile_sites ps
  join public.profiles p on p.id = ps.profile_id
  where
    p.profile_type = 'business'
    and p.is_profile_complete
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
    )

  union all

  select
    p.latitude,
    p.longitude,
    p.primary_category,
    p.is_featured
  from public.profiles p
  where
    p.profile_type = 'business'
    and p.is_profile_complete
    and p.latitude is not null
    and p.longitude is not null
    and not p.is_hidden
    and not p.is_suspended
    and public.has_active_member_access(p.user_id)
    and not exists (
      select 1
      from public.profile_sites ps
      where ps.profile_id = p.id
        and ps.latitude is not null
        and ps.longitude is not null
    )
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

-- ---------------------------------------------------------------------------
-- 3. After running this script
-- ---------------------------------------------------------------------------
-- Ask members to open Edit profile and save once so is_profile_complete updates.
-- Or run a one-off backfill in SQL Editor if you add a server-side checker later.
