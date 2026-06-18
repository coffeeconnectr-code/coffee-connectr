-- Run in Supabase SQL Editor after profile_completion.sql
-- Lists profiles in Discover/map at 0% completion (all members with a profile).
-- The is_profile_complete column now means "listed publicly".

create or replace function public.profile_meets_listing_threshold(p public.profiles)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  total_checks integer := 0;
  completed_checks integer := 0;
  site_count integer := 0;
begin
  if p is null then
    return false;
  end if;

  total_checks := total_checks + 1;
  if p.name is not null and btrim(p.name) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.profile_photo_url is not null and btrim(p.profile_photo_url) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.cover_image_url is not null and btrim(p.cover_image_url) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.primary_category is not null and btrim(p.primary_category) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if coalesce(array_length(p.secondary_categories, 1), 0) > 0 then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.about_bio is not null and btrim(p.about_bio) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.website is not null and btrim(p.website) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.linkedin_url is not null and btrim(p.linkedin_url) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.instagram_url is not null and btrim(p.instagram_url) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.contact_email is not null and btrim(p.contact_email) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  total_checks := total_checks + 1;
  if p.contact_phone is not null and btrim(p.contact_phone) <> '' then
    completed_checks := completed_checks + 1;
  end if;

  if p.profile_type = 'business' then
    select count(*)
    into site_count
    from public.profile_sites ps
    where ps.profile_id = p.id
      and ps.site_name is not null
      and btrim(ps.site_name) <> ''
      and ps.location is not null
      and btrim(ps.location) <> ''
      and ps.latitude is not null
      and ps.longitude is not null;

    total_checks := total_checks + 1;
    if site_count > 0 then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.business_type is not null and btrim(p.business_type) <> '' then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.year_established is not null then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.team_size is not null and btrim(p.team_size) <> '' then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.services_offered is not null and btrim(p.services_offered) <> '' then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.opening_hours is not null and btrim(p.opening_hours) <> '' then
      completed_checks := completed_checks + 1;
    end if;
  else
    total_checks := total_checks + 1;
    if p.latitude is not null and p.longitude is not null then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.job_title_role is not null and btrim(p.job_title_role) <> '' then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.years_of_experience is not null then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if coalesce(array_length(p.skills_specialties, 1), 0) > 0 then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if p.certifications is not null and btrim(p.certifications) <> '' then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if coalesce(array_length(p.open_to_status, 1), 0) > 0 then
      completed_checks := completed_checks + 1;
    end if;

    total_checks := total_checks + 1;
    if coalesce(array_length(p.languages, 1), 0) > 0 then
      completed_checks := completed_checks + 1;
    end if;
  end if;

  return (completed_checks::numeric / total_checks::numeric) >= 0;
end;
$$;

update public.profiles p
set is_profile_complete = public.profile_meets_listing_threshold(p);

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
      and public.profile_meets_listing_threshold(profiles)
    )
  )
);

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
    and public.profile_meets_listing_threshold(p)
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
    and public.profile_meets_listing_threshold(p)
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
    and public.profile_meets_listing_threshold(p)
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

drop function if exists public.admin_list_incomplete_profile_members(text, integer);

create or replace function public.admin_list_incomplete_profile_members(
  p_search text default '',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  profile_type text,
  is_profile_complete boolean,
  user_created_at timestamptz,
  profile_updated_at timestamptz,
  reminder_count integer,
  last_reminder_sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    u.id as user_id,
    u.email::text,
    coalesce(p.name, '(no profile)') as profile_name,
    coalesce(p.profile_type, 'unknown') as profile_type,
    coalesce(p.is_profile_complete, false) as is_profile_complete,
    u.created_at as user_created_at,
    p.updated_at as profile_updated_at,
    coalesce(rem.reminder_count, 0) as reminder_count,
    rem.last_reminder_sent_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join lateral (
    select
      count(*)::integer as reminder_count,
      max(r.sent_at) as last_reminder_sent_at
    from public.profile_reminder_emails_sent r
    where r.user_id = u.id
  ) rem on true
  where
    (
      p.id is null
      or not public.profile_meets_listing_threshold(p)
    )
    and coalesce(p.is_hidden, false) = false
    and coalesce(p.is_suspended, false) = false
    and (
      p_search = ''
      or u.email ilike '%' || p_search || '%'
      or coalesce(p.name, '') ilike '%' || p_search || '%'
    )
  order by coalesce(p.updated_at, u.created_at) desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.admin_list_incomplete_profile_members(text, integer) from public;
grant execute on function public.admin_list_incomplete_profile_members(text, integer) to authenticated;
