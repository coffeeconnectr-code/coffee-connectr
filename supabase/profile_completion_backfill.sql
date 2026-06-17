-- Run in Supabase SQL Editor to restore map/Discover visibility for existing members.
-- Use this after profile_completion.sql if everyone's profiles disappeared from the map.
--
-- New saves still enforce full completion rules in the app.
-- This only grandfathers profiles that were already live (name, category, map pin).

update public.profiles p
set is_profile_complete = true
where
  coalesce(p.is_profile_complete, false) = false
  and not p.is_hidden
  and not p.is_suspended
  and public.has_active_member_access(p.user_id)
  and p.name is not null
  and trim(p.name) <> ''
  and p.primary_category is not null
  and (
    (
      p.profile_type = 'individual'
      and p.latitude is not null
      and p.longitude is not null
    )
    or (
      p.profile_type = 'business'
      and (
        exists (
          select 1
          from public.profile_sites ps
          where ps.profile_id = p.id
            and ps.latitude is not null
            and ps.longitude is not null
        )
        or (
          p.latitude is not null
          and p.longitude is not null
        )
      )
    )
  );

-- Check how many profiles are visible again:
-- select count(*) from public.profiles where is_profile_complete;
