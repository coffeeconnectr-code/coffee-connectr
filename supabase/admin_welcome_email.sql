-- Run in Supabase SQL Editor AFTER admin.sql and welcome_email.sql
-- Adds admin listing of members with welcome-email status.

create or replace function public.admin_list_welcome_email_members(
  p_search text default '',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  user_created_at timestamptz,
  welcome_status text,
  welcome_sent_at timestamptz
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
    u.created_at as user_created_at,
    w.status as welcome_status,
    w.sent_at as welcome_sent_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.welcome_emails_sent w on w.user_id = u.id
  where
    p_search = ''
    or u.email ilike '%' || p_search || '%'
    or coalesce(p.name, '') ilike '%' || p_search || '%'
  order by u.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.admin_list_welcome_email_members(text, integer) from public;
grant execute on function public.admin_list_welcome_email_members(text, integer) to authenticated;
