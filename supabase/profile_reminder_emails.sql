-- Run ONLY this file in the Supabase SQL Editor.
-- Do NOT re-run admin.sql — that causes admin_list_reports conflicts if admin_phase2.sql was already applied.
--
-- Prerequisites: profile_completion.sql and admin.sql (already run once).
-- Tracks admin "finish your profile" reminder emails.

create table if not exists public.profile_reminder_emails_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users (id) on delete set null
);

create index if not exists profile_reminder_emails_sent_user_id_idx
on public.profile_reminder_emails_sent (user_id, sent_at desc);

alter table public.profile_reminder_emails_sent disable row level security;

grant select, insert, update, delete on public.profile_reminder_emails_sent to service_role;

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
    coalesce(p.is_profile_complete, false) = false
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
