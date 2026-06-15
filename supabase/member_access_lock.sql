-- Run in Supabase SQL Editor AFTER admin.sql, subscriptions.sql, noticeboard.sql, and resources.sql
-- Locks member content to active members. Anonymous users only get map pin locations via get_public_map_pins().

-- ---------------------------------------------------------------------------
-- 1. Profiles: full details only for active members (and admins / own profile)
-- ---------------------------------------------------------------------------

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Public profiles are viewable" on public.profiles;

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
    or public.has_active_member_access(auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 2. Roasting equipment visible only to members browsing profiles
-- ---------------------------------------------------------------------------

drop policy if exists "Roasters are viewable by everyone" on public.profile_roasters;

create policy "Members can view profile roasters"
on public.profile_roasters
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_roasters.profile_id
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

-- ---------------------------------------------------------------------------
-- 3. Noticeboard + resources: members only
-- ---------------------------------------------------------------------------

drop policy if exists "Active noticeboard posts are public" on public.noticeboard_posts;

create policy "Members can view noticeboard posts"
on public.noticeboard_posts
for select
to authenticated
using (
  (
    status in ('active', 'sold', 'filled')
    and not is_hidden
  )
  and (
    auth.uid() = user_id
    or public.is_current_user_admin()
    or public.has_active_member_access(auth.uid())
  )
);

drop policy if exists "Active resources are public" on public.resource_posts;

create policy "Members can view resources"
on public.resource_posts
for select
to authenticated
using (
  (
    status = 'active'
    and not is_hidden
  )
  and (
    auth.uid() = user_id
    or public.is_current_user_admin()
    or public.has_active_member_access(auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 4. Public map preview: pin coordinates + category only (no names or profile links)
-- ---------------------------------------------------------------------------

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
    p.latitude is not null
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
    );
$$;

revoke all on function public.get_public_map_pins(text, text) from public;
grant execute on function public.get_public_map_pins(text, text) to anon;
grant execute on function public.get_public_map_pins(text, text) to authenticated;
