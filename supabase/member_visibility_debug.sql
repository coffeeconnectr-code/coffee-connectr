-- Run in Supabase SQL Editor to find why a member is not showing on Discover/map.
-- Compare totals at the bottom, then inspect rows where visible_on_map is false.

select
  u.email,
  coalesce(p.name, '(no profile saved)') as profile_name,
  coalesce(p.profile_type, 'none') as profile_type,
  coalesce(p.is_profile_complete, false) as profile_complete,
  coalesce(p.is_hidden, false) as hidden,
  coalesce(p.is_suspended, false) as suspended,
  public.has_active_member_access(u.id) as active_membership,
  p.latitude,
  p.longitude,
  (
    select count(*)
    from public.profile_sites ps
    where ps.profile_id = p.id
      and ps.latitude is not null
      and ps.longitude is not null
  ) as business_site_pins,
  case
    when p.id is null then 'no profile saved yet'
    when coalesce(p.is_hidden, false) then 'profile hidden by admin'
    when coalesce(p.is_suspended, false) then 'profile suspended'
    when not public.has_active_member_access(u.id) then 'trial/subscription inactive'
    when coalesce(p.is_profile_complete, false) = false then 'profile incomplete'
    when p.profile_type = 'individual'
      and (p.latitude is null or p.longitude is null) then 'individual missing map pin'
    when p.profile_type = 'business'
      and not exists (
        select 1
        from public.profile_sites ps
        where ps.profile_id = p.id
          and ps.latitude is not null
          and ps.longitude is not null
      )
      and (p.latitude is null or p.longitude is null) then 'business missing map pin'
    else 'visible on map'
  end as visibility_reason,
  case
    when p.id is null then false
    when coalesce(p.is_hidden, false) then false
    when coalesce(p.is_suspended, false) then false
    when not public.has_active_member_access(u.id) then false
    when coalesce(p.is_profile_complete, false) = false then false
    when p.profile_type = 'individual'
      and (p.latitude is null or p.longitude is null) then false
    when p.profile_type = 'business'
      and not exists (
        select 1
        from public.profile_sites ps
        where ps.profile_id = p.id
          and ps.latitude is not null
          and ps.longitude is not null
      )
      and (p.latitude is null or p.longitude is null) then false
    else true
  end as visible_on_map
from auth.users u
left join public.profiles p on p.user_id = u.id
order by u.created_at;

-- Summary counts:
-- select
--   count(*) as total_users,
--   count(*) filter (where p.id is not null) as profiles_saved,
--   count(*) filter (where coalesce(p.is_profile_complete, false)) as profiles_complete,
--   count(*) filter (where visible_on_map) as visible_on_map
-- from (
--   select
--     u.id,
--     p.id as profile_id,
--     p.is_profile_complete,
--     case
--       when p.id is null then false
--       when coalesce(p.is_hidden, false) then false
--       when coalesce(p.is_suspended, false) then false
--       when not public.has_active_member_access(u.id) then false
--       when coalesce(p.is_profile_complete, false) = false then false
--       when p.profile_type = 'individual'
--         and (p.latitude is null or p.longitude is null) then false
--       when p.profile_type = 'business'
--         and not exists (
--           select 1 from public.profile_sites ps
--           where ps.profile_id = p.id and ps.latitude is not null and ps.longitude is not null
--         )
--         and (p.latitude is null or p.longitude is null) then false
--       else true
--     end as visible_on_map
--   from auth.users u
--   left join public.profiles p on p.user_id = u.id
-- ) summary;
