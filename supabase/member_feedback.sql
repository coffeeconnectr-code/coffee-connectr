-- Run in Supabase SQL Editor AFTER admin.sql
-- Member feedback with optional screenshot uploads for the admin queue.

create table if not exists public.member_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  message text not null,
  screenshot_url text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_feedback_status_idx on public.member_feedback (status);
create index if not exists member_feedback_user_id_idx on public.member_feedback (user_id);
create index if not exists member_feedback_created_at_idx on public.member_feedback (created_at desc);

alter table public.member_feedback enable row level security;

drop policy if exists "Users can create feedback" on public.member_feedback;
create policy "Users can create feedback"
on public.member_feedback
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view own feedback" on public.member_feedback;
create policy "Users can view own feedback"
on public.member_feedback
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all feedback" on public.member_feedback;
create policy "Admins can view all feedback"
on public.member_feedback
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "Admins can update feedback" on public.member_feedback;
create policy "Admins can update feedback"
on public.member_feedback
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "Public read feedback screenshots" on storage.objects;
create policy "Public read feedback screenshots"
on storage.objects
for select
to public
using (bucket_id = 'feedback-screenshots');

drop policy if exists "Members upload feedback screenshots" on storage.objects;
create policy "Members upload feedback screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members update own feedback screenshots" on storage.objects;
create policy "Members update own feedback screenshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members delete own feedback screenshots" on storage.objects;
create policy "Members delete own feedback screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.submit_member_feedback(
  p_message text,
  p_screenshot_url text default null
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

  if nullif(trim(p_message), '') is null then
    raise exception 'Feedback message is required';
  end if;

  insert into public.member_feedback (user_id, message, screenshot_url)
  values (
    auth.uid(),
    trim(p_message),
    nullif(trim(p_screenshot_url), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_member_feedback(text, text) from public;
grant execute on function public.submit_member_feedback(text, text) to authenticated;

create or replace function public.list_my_feedback()
returns setof public.member_feedback
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  return query
  select *
  from public.member_feedback
  where user_id = auth.uid()
  order by created_at desc
  limit 20;
end;
$$;

revoke all on function public.list_my_feedback() from public;
grant execute on function public.list_my_feedback() to authenticated;

create or replace function public.admin_list_member_feedback(p_status text default 'open')
returns table (
  id uuid,
  user_id uuid,
  profile_name text,
  user_email text,
  message text,
  screenshot_url text,
  status text,
  admin_notes text,
  resolved_at timestamptz,
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
    mf.id,
    mf.user_id,
    p.name as profile_name,
    u.email::text as user_email,
    mf.message,
    mf.screenshot_url,
    mf.status,
    mf.admin_notes,
    mf.resolved_at,
    mf.created_at
  from public.member_feedback mf
  left join public.profiles p on p.user_id = mf.user_id
  left join auth.users u on u.id = mf.user_id
  where p_status = '' or mf.status = p_status
  order by mf.created_at desc
  limit 100;
end;
$$;

create or replace function public.admin_resolve_member_feedback(
  p_feedback_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  update public.member_feedback
  set
    status = 'resolved',
    admin_notes = nullif(trim(p_admin_notes), ''),
    resolved_at = now()
  where id = p_feedback_id
    and status = 'open';

  if not found then
    raise exception 'Feedback not found or already resolved';
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
  open_feedback integer;
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
  select count(*) into open_feedback
  from public.member_feedback where status = 'open';

  return json_build_object(
    'profiles', profile_count,
    'listings', listing_count,
    'messages', message_count,
    'users', user_count,
    'open_reports', open_reports,
    'pending_verifications', pending_verifications,
    'pending_featured', pending_featured,
    'open_feedback', open_feedback
  );
end;
$$;

revoke all on function public.admin_list_member_feedback(text) from public;
grant execute on function public.admin_list_member_feedback(text) to authenticated;

revoke all on function public.admin_resolve_member_feedback(uuid, text) from public;
grant execute on function public.admin_resolve_member_feedback(uuid, text) to authenticated;
