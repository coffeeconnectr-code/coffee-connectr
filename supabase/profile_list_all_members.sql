-- Run in Supabase SQL Editor to show all members with a profile in Discover.
-- Use this if members are still hidden after lowering the completion threshold in the app.

create or replace function public.profile_meets_listing_threshold(p public.profiles)
returns boolean
language sql
stable
set search_path = public
as $$
  select p.id is not null;
$$;

update public.profiles
set is_profile_complete = true;

-- Quick check: every saved profile should now be listed.
-- select count(*) as total_profiles, count(*) filter (where is_profile_complete) as listed_profiles from public.profiles;
