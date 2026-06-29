-- Run in Supabase SQL Editor AFTER admin.sql and admin_phase2.sql
-- Adds admin member broadcast emails (updates and announcements to all signed-up members).
--
-- Deploy edge function:
--   npx supabase functions deploy send-member-broadcast --project-ref xfrgctnrafhhcfkcoplp

create table if not exists public.member_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  subject text not null,
  message text not null,
  exclude_suspended boolean not null default true,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'partial', 'failed')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_broadcasts_created_at_idx
on public.member_broadcasts (created_at desc);

alter table public.member_broadcasts enable row level security;

drop policy if exists "Admins can view member broadcasts" on public.member_broadcasts;
create policy "Admins can view member broadcasts"
on public.member_broadcasts
for select
to authenticated
using (public.is_current_user_admin());

grant select on public.member_broadcasts to authenticated;
grant all on public.member_broadcasts to service_role;

create or replace function public.admin_count_member_broadcast_recipients(
  p_exclude_suspended boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_current_user_admin();

  select count(*)::integer
  into v_count
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.email is not null
    and (
      not p_exclude_suspended
      or coalesce(p.is_suspended, false) = false
    );

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.admin_create_member_broadcast(
  p_subject text,
  p_message text,
  p_exclude_suspended boolean default true
)
returns table (
  broadcast_id uuid,
  recipient_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject text := trim(coalesce(p_subject, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_recipient_count integer;
  v_broadcast_id uuid;
begin
  perform public.assert_current_user_admin();

  if v_subject = '' then
    raise exception 'Subject is required';
  end if;

  if char_length(v_subject) > 200 then
    raise exception 'Subject must be 200 characters or fewer';
  end if;

  if v_message = '' then
    raise exception 'Message is required';
  end if;

  if char_length(v_message) > 12000 then
    raise exception 'Message must be 12,000 characters or fewer';
  end if;

  v_recipient_count := public.admin_count_member_broadcast_recipients(p_exclude_suspended);

  if v_recipient_count = 0 then
    raise exception 'No members match the selected recipient filters';
  end if;

  insert into public.member_broadcasts (
    created_by,
    subject,
    message,
    exclude_suspended,
    recipient_count,
    status
  )
  values (
    auth.uid(),
    v_subject,
    v_message,
    coalesce(p_exclude_suspended, true),
    v_recipient_count,
    'sending'
  )
  returning id into v_broadcast_id;

  broadcast_id := v_broadcast_id;
  recipient_count := v_recipient_count;
  return next;
end;
$$;

create or replace function public.admin_list_member_broadcasts(
  p_limit integer default 20
)
returns table (
  id uuid,
  subject text,
  message text,
  exclude_suspended boolean,
  recipient_count integer,
  sent_count integer,
  failed_count integer,
  status text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz,
  created_by_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    mb.id,
    mb.subject,
    mb.message,
    mb.exclude_suspended,
    mb.recipient_count,
    mb.sent_count,
    mb.failed_count,
    mb.status,
    mb.last_error,
    mb.sent_at,
    mb.created_at,
    coalesce(p.name, '(unknown admin)') as created_by_name
  from public.member_broadcasts mb
  left join public.profiles p on p.user_id = mb.created_by
  order by mb.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.service_list_member_broadcast_recipients(
  p_exclude_suspended boolean,
  p_limit integer,
  p_offset integer
)
returns table (
  user_id uuid,
  email text,
  profile_name text
)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(nullif(trim(p.name), ''), split_part(u.email::text, '@', 1)) as profile_name
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.email is not null
    and (
      not p_exclude_suspended
      or coalesce(p.is_suspended, false) = false
    )
  order by u.created_at asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.admin_count_member_broadcast_recipients(boolean) from public;
grant execute on function public.admin_count_member_broadcast_recipients(boolean) to authenticated;

revoke all on function public.admin_create_member_broadcast(text, text, boolean) from public;
grant execute on function public.admin_create_member_broadcast(text, text, boolean) to authenticated;

revoke all on function public.admin_list_member_broadcasts(integer) from public;
grant execute on function public.admin_list_member_broadcasts(integer) to authenticated;

revoke all on function public.service_list_member_broadcast_recipients(boolean, integer, integer) from public;
grant execute on function public.service_list_member_broadcast_recipients(boolean, integer, integer) to service_role;
