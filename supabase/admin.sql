-- Run in Supabase SQL Editor → New query → paste → Run
-- ORDER: Run this AFTER profiles.sql, noticeboard.sql, messages.sql
--
-- STEP 1: Run this entire script
-- STEP 2: Make yourself admin (see bottom of file)

-- ---------------------------------------------------------------------------
-- 1. Admin / moderation columns on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
add column if not exists is_admin boolean not null default false,
add column if not exists is_suspended boolean not null default false,
add column if not exists is_hidden boolean not null default false,
add column if not exists is_verified boolean not null default false;

alter table public.noticeboard_posts
add column if not exists is_hidden boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Reports + verification tables
-- ---------------------------------------------------------------------------

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete cascade not null,
  target_type text not null check (target_type in ('profile', 'listing', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(trim(reason)) > 0),
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists content_reports_status_idx on public.content_reports (status);
create index if not exists content_reports_created_at_idx on public.content_reports (created_at desc);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_requests_status_idx on public.verification_requests (status);
create index if not exists verification_requests_user_id_idx on public.verification_requests (user_id);

alter table public.content_reports enable row level security;
alter table public.verification_requests enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Core security helpers (database enforces admin — not just the app)
-- ---------------------------------------------------------------------------

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid()),
    false
  );
$$;

create or replace function public.assert_current_user_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Access denied';
  end if;
end;
$$;

create or replace function public.is_user_suspended(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_suspended from public.profiles where user_id = check_user_id),
    false
  );
$$;

-- Users cannot promote themselves to admin or change moderation flags on themselves
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
    return new;
  end if;

  if auth.uid() = new.user_id and not public.is_current_user_admin() then
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.is_hidden := old.is_hidden;
    new.is_verified := old.is_verified;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
before insert or update on public.profiles
for each row
execute function public.protect_profile_admin_fields();

create or replace function public.protect_listing_hidden_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.is_hidden := false;
    return new;
  end if;

  if auth.uid() = new.user_id and not public.is_current_user_admin() then
    new.is_hidden := old.is_hidden;
  end if;

  return new;
end;
$$;

drop trigger if exists noticeboard_posts_protect_hidden on public.noticeboard_posts;
create trigger noticeboard_posts_protect_hidden
before insert or update on public.noticeboard_posts
for each row
execute function public.protect_listing_hidden_field();

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

revoke all on function public.assert_current_user_admin() from public;

-- ---------------------------------------------------------------------------
-- 4. Tighten public read policies (hide moderated content)
-- ---------------------------------------------------------------------------

drop policy if exists "Profiles are viewable by everyone" on public.profiles;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
on public.profiles
for select
to public
using (not is_hidden and not is_suspended);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Active noticeboard posts are public" on public.noticeboard_posts;
create policy "Active noticeboard posts are public"
on public.noticeboard_posts
for select
to public
using (
  status in ('active', 'sold', 'filled')
  and not is_hidden
  or auth.uid() = user_id
);

drop policy if exists "Admins can view all listings" on public.noticeboard_posts;
create policy "Admins can view all listings"
on public.noticeboard_posts
for select
to authenticated
using (public.is_current_user_admin());

-- Block suspended users from posting
drop policy if exists "Members can create noticeboard posts" on public.noticeboard_posts;
create policy "Members can create noticeboard posts"
on public.noticeboard_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
);

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and not public.is_user_suspended(auth.uid())
);

-- Reports: users can file, only admins can read all
drop policy if exists "Users can create reports" on public.content_reports;
create policy "Users can create reports"
on public.content_reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own reports" on public.content_reports;
create policy "Users can view own reports"
on public.content_reports
for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "Admins can view all reports" on public.content_reports;
create policy "Admins can view all reports"
on public.content_reports
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Admins can update reports" on public.content_reports;
create policy "Admins can update reports"
on public.content_reports
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- Verification requests
drop policy if exists "Users can create verification requests" on public.verification_requests;
create policy "Users can create verification requests"
on public.verification_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own verification requests" on public.verification_requests;
create policy "Users can view own verification requests"
on public.verification_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all verification requests" on public.verification_requests;
create policy "Admins can view all verification requests"
on public.verification_requests
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Admins can update verification requests" on public.verification_requests;
create policy "Admins can update verification requests"
on public.verification_requests
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- 5. User-facing RPCs (report + verification request)
-- ---------------------------------------------------------------------------

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
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

  if p_target_type = 'profile' and p_target_id = auth.uid() then
    raise exception 'You cannot report your own profile';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
  values (auth.uid(), p_target_type, p_target_id, trim(p_reason), nullif(trim(p_details), ''))
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_content_report(text, uuid, text, text) from public;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;

create or replace function public.submit_verification_request(p_message text default null)
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
    from public.verification_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a pending verification request';
  end if;

  insert into public.verification_requests (user_id, message)
  values (auth.uid(), nullif(trim(p_message), ''))
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_verification_request(text) from public;
grant execute on function public.submit_verification_request(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin-only RPCs (every function checks assert_current_user_admin)
-- ---------------------------------------------------------------------------

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
begin
  perform public.assert_current_user_admin();

  select count(*) into profile_count from public.profiles;
  select count(*) into listing_count from public.noticeboard_posts;
  select count(*) into message_count from public.messages;
  select count(*) into user_count from auth.users;
  select count(*) into open_reports from public.content_reports where status = 'open';
  select count(*) into pending_verifications
  from public.verification_requests where status = 'pending';

  return json_build_object(
    'profiles', profile_count,
    'listings', listing_count,
    'messages', message_count,
    'users', user_count,
    'open_reports', open_reports,
    'pending_verifications', pending_verifications
  );
end;
$$;

create or replace function public.admin_list_profiles(
  p_search text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select *
  from public.profiles
  where
    p_search = ''
    or name ilike '%' || p_search || '%'
    or coalesce(location, '') ilike '%' || p_search || '%'
  order by created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_list_listings(
  p_search text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.noticeboard_posts
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select *
  from public.noticeboard_posts
  where
    p_search = ''
    or title ilike '%' || p_search || '%'
    or coalesce(location, '') ilike '%' || p_search || '%'
  order by created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_hide_profile(p_user_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  update public.profiles
  set is_hidden = p_hidden
  where user_id = p_user_id;
end;
$$;

create or replace function public.admin_suspend_user(p_user_id uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if p_user_id = auth.uid() then
    raise exception 'You cannot suspend your own account';
  end if;

  update public.profiles
  set is_suspended = p_suspended
  where user_id = p_user_id;
end;
$$;

create or replace function public.admin_delete_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own profile';
  end if;

  delete from public.profiles where user_id = p_user_id;
end;
$$;

create or replace function public.admin_hide_listing(p_post_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  update public.noticeboard_posts
  set is_hidden = p_hidden
  where id = p_post_id;
end;
$$;

create or replace function public.admin_delete_listing(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  delete from public.noticeboard_posts where id = p_post_id;
end;
$$;

create or replace function public.admin_list_reports(p_status text default 'open')
returns setof public.content_reports
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select *
  from public.content_reports
  where p_status = '' or status = p_status
  order by created_at desc;
end;
$$;

create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if p_status not in ('resolved', 'dismissed') then
    raise exception 'Invalid report status';
  end if;

  update public.content_reports
  set
    status = p_status,
    admin_notes = nullif(trim(p_admin_notes), ''),
    resolved_at = now()
  where id = p_report_id;
end;
$$;

create or replace function public.admin_list_verification_requests(p_status text default 'pending')
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
    vr.id,
    vr.user_id,
    p.name as profile_name,
    vr.message,
    vr.status,
    vr.admin_reason,
    vr.reviewed_at,
    vr.created_at
  from public.verification_requests vr
  left join public.profiles p on p.user_id = vr.user_id
  where p_status = '' or vr.status = p_status
  order by vr.created_at desc;
end;
$$;

create or replace function public.admin_review_verification(
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
  from public.verification_requests
  where id = p_request_id and status = 'pending';

  if target_user_id is null then
    raise exception 'Request not found or already reviewed';
  end if;

  update public.verification_requests
  set
    status = case when p_approved then 'approved' else 'rejected' end,
    admin_reason = nullif(trim(p_reason), ''),
    reviewed_at = now()
  where id = p_request_id;

  if p_approved then
    update public.profiles
    set is_verified = true
    where user_id = target_user_id;
  end if;
end;
$$;

revoke all on function public.admin_get_dashboard_stats() from public;
revoke all on function public.admin_list_profiles(text, integer, integer) from public;
revoke all on function public.admin_list_listings(text, integer, integer) from public;
revoke all on function public.admin_hide_profile(uuid, boolean) from public;
revoke all on function public.admin_suspend_user(uuid, boolean) from public;
revoke all on function public.admin_delete_profile(uuid) from public;
revoke all on function public.admin_hide_listing(uuid, boolean) from public;
revoke all on function public.admin_delete_listing(uuid) from public;
revoke all on function public.admin_list_reports(text) from public;
revoke all on function public.admin_resolve_report(uuid, text, text) from public;
revoke all on function public.admin_list_verification_requests(text) from public;
revoke all on function public.admin_review_verification(uuid, boolean, text) from public;

grant execute on function public.admin_get_dashboard_stats() to authenticated;
grant execute on function public.admin_list_profiles(text, integer, integer) to authenticated;
grant execute on function public.admin_list_listings(text, integer, integer) to authenticated;
grant execute on function public.admin_hide_profile(uuid, boolean) to authenticated;
grant execute on function public.admin_suspend_user(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_profile(uuid) to authenticated;
grant execute on function public.admin_hide_listing(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_listing(uuid) to authenticated;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;
grant execute on function public.admin_list_verification_requests(text) to authenticated;
grant execute on function public.admin_review_verification(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 2: Make YOUR account the admin (run separately after you know your id)
-- ---------------------------------------------------------------------------
--
-- Find your user id:
--   select id, email from auth.users order by created_at desc;
--
-- Then run (replace YOUR-USER-ID-HERE):
--   update public.profiles
--   set is_admin = true
--   where user_id = 'YOUR-USER-ID-HERE';
--
-- Confirm it worked:
--   select user_id, name, is_admin from public.profiles where is_admin = true;
