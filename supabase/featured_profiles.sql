-- Run in Supabase SQL Editor AFTER admin.sql
-- Adds featured profile requests, admin review, discover sorting support, and featured map pins.

alter table public.profiles
add column if not exists is_featured boolean not null default false;

create table if not exists public.featured_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists featured_requests_status_idx on public.featured_requests (status);
create index if not exists featured_requests_user_id_idx on public.featured_requests (user_id);

alter table public.featured_requests enable row level security;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.is_suspended := false;
    new.is_hidden := false;
    new.is_verified := false;
    new.is_featured := false;
    return new;
  end if;

  if auth.uid() = new.user_id and not public.is_current_user_admin() then
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.is_hidden := old.is_hidden;
    new.is_verified := old.is_verified;
    new.is_featured := old.is_featured;
  end if;

  return new;
end;
$$;

drop policy if exists "Users can create featured requests" on public.featured_requests;
create policy "Users can create featured requests"
on public.featured_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own featured requests" on public.featured_requests;
create policy "Users can view own featured requests"
on public.featured_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all featured requests" on public.featured_requests;
create policy "Admins can view all featured requests"
on public.featured_requests
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Admins can update featured requests" on public.featured_requests;
create policy "Admins can update featured requests"
on public.featured_requests
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create or replace function public.submit_featured_request(p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if exists (
    select 1
    from public.profiles
    where user_id = auth.uid() and is_featured
  ) then
    raise exception 'Your profile is already featured';
  end if;

  if exists (
    select 1
    from public.featured_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a pending featured request';
  end if;

  insert into public.featured_requests (user_id, message)
  values (auth.uid(), nullif(trim(p_message), ''))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.admin_list_featured_requests(p_status text default 'pending')
returns table (
  id uuid,
  user_id uuid,
  profile_name text,
  message text,
  status text,
  admin_reason text,
  reviewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    fr.id,
    fr.user_id,
    p.name as profile_name,
    fr.message,
    fr.status,
    fr.admin_reason,
    fr.reviewed_at,
    fr.created_at
  from public.featured_requests fr
  left join public.profiles p on p.user_id = fr.user_id
  where p_status = '' or fr.status = p_status
  order by fr.created_at desc;
end;
$$;

create or replace function public.admin_review_featured(
  p_request_id uuid,
  p_approved boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  perform public.assert_current_user_admin();

  select user_id into target_user_id
  from public.featured_requests
  where id = p_request_id and status = 'pending';

  if target_user_id is null then
    raise exception 'Request not found or already reviewed';
  end if;

  update public.featured_requests
  set
    status = case when p_approved then 'approved' else 'rejected' end,
    admin_reason = nullif(trim(p_reason), ''),
    reviewed_at = now()
  where id = p_request_id;

  if p_approved then
    update public.profiles
    set is_featured = true
    where user_id = target_user_id;
  end if;

  if exists (
    select 1
    from pg_proc
    where proname = 'log_admin_action'
      and pronamespace = 'public'::regnamespace
  ) then
    perform public.log_admin_action(
      case when p_approved then 'approve_featured' else 'reject_featured' end,
      'featured',
      p_request_id,
      jsonb_build_object('user_id', target_user_id)
    );
  end if;
end;
$$;

create or replace function public.admin_get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_count integer;
  listing_count integer;
  message_count integer;
  user_count integer;
  open_reports integer;
  pending_verifications integer;
  pending_featured integer;
begin
  perform public.assert_current_user_admin();

  select count(*) into profile_count from public.profiles;
  select count(*) into listing_count from public.noticeboard_posts;
  select count(*) into message_count from public.messages;
  select count(*) into user_count from auth.users;
  select count(*) into open_reports from public.content_reports where status = 'open';
  select count(*) into pending_verifications
  from public.verification_requests where status = 'pending';
  select count(*) into pending_featured
  from public.featured_requests where status = 'pending';

  return json_build_object(
    'profiles', profile_count,
    'listings', listing_count,
    'messages', message_count,
    'users', user_count,
    'open_reports', open_reports,
    'pending_verifications', pending_verifications,
    'pending_featured', pending_featured
  );
end;
$$;

-- Return featured flag for public / preview map pins.
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

revoke all on function public.submit_featured_request(text) from public;
grant execute on function public.submit_featured_request(text) to authenticated;

revoke all on function public.admin_list_featured_requests(text) from public;
revoke all on function public.admin_review_featured(uuid, boolean, text) from public;
grant execute on function public.admin_list_featured_requests(text) to authenticated;
grant execute on function public.admin_review_featured(uuid, boolean, text) to authenticated;
