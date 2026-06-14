-- Run in Supabase SQL Editor AFTER admin.sql
-- Adds: audit log, message report validation, report context in admin queue

-- ---------------------------------------------------------------------------
-- 1. Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create or replace function public.log_admin_action(
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_details jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Improved report submission (block own messages)
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

  if p_target_type = 'message' and exists (
    select 1 from public.messages where id = p_target_id and sender_id = auth.uid()
  ) then
    raise exception 'You cannot report your own message';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
  values (auth.uid(), p_target_type, p_target_id, trim(p_reason), nullif(trim(p_details), ''))
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Admin reports with target summary (incl. messages)
-- Must DROP first — return type changed from content_reports to include target_summary
-- ---------------------------------------------------------------------------

drop function if exists public.admin_list_reports(text);

create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  id uuid,
  reporter_id uuid,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  status text,
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz,
  target_summary text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    r.id,
    r.reporter_id,
    r.target_type,
    r.target_id,
    r.reason,
    r.details,
    r.status,
    r.admin_notes,
    r.resolved_at,
    r.created_at,
    case r.target_type
      when 'profile' then (
        select p.name from public.profiles p where p.user_id = r.target_id
      )
      when 'listing' then (
        select np.title from public.noticeboard_posts np where np.id = r.target_id
      )
      when 'message' then (
        select left(m.body, 120) from public.messages m where m.id = r.target_id
      )
      else null
    end as target_summary
  from public.content_reports r
  where p_status = '' or r.status = p_status
  order by r.created_at desc;
end;
$$;

create or replace function public.admin_list_audit_log(p_limit integer default 100)
returns setof public.admin_audit_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select *
  from public.admin_audit_log
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Re-create admin action RPCs with audit logging
-- ---------------------------------------------------------------------------

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

  perform public.log_admin_action(
    case when p_hidden then 'hide_profile' else 'unhide_profile' end,
    'profile',
    p_user_id,
    jsonb_build_object('hidden', p_hidden)
  );
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

  perform public.log_admin_action(
    case when p_suspended then 'suspend_user' else 'unsuspend_user' end,
    'profile',
    p_user_id,
    jsonb_build_object('suspended', p_suspended)
  );
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

  perform public.log_admin_action('delete_profile', 'profile', p_user_id);
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

  perform public.log_admin_action(
    case when p_hidden then 'hide_listing' else 'unhide_listing' end,
    'listing',
    p_post_id,
    jsonb_build_object('hidden', p_hidden)
  );
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

  perform public.log_admin_action('delete_listing', 'listing', p_post_id);
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

  perform public.log_admin_action(
    'resolve_report',
    'report',
    p_report_id,
    jsonb_build_object('status', p_status)
  );
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

  perform public.log_admin_action(
    case when p_approved then 'approve_verification' else 'reject_verification' end,
    'verification',
    p_request_id,
    jsonb_build_object('user_id', target_user_id, 'reason', p_reason)
  );
end;
$$;

revoke all on function public.admin_list_audit_log(integer) from public;
grant execute on function public.admin_list_audit_log(integer) to authenticated;

revoke all on function public.admin_list_reports(text) from public;
grant execute on function public.admin_list_reports(text) to authenticated;
