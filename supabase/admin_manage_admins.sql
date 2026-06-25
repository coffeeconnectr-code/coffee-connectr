-- Run in Supabase SQL Editor after admin.sql and admin_phase2.sql
-- Lets admins promote or demote other members.

create or replace function public.admin_list_users_for_admin_access(
  p_search text default '',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  is_admin boolean,
  user_created_at timestamptz
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
    coalesce(p.is_admin, false) as is_admin,
    u.created_at as user_created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where
    p_search = ''
    or u.email ilike '%' || p_search || '%'
    or coalesce(p.name, '') ilike '%' || p_search || '%'
  order by coalesce(p.is_admin, false) desc, u.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.admin_list_users_for_admin_access(text, integer) to authenticated;

create or replace function public.admin_set_user_admin(
  p_user_id uuid,
  p_is_admin boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
  v_profile_name text;
begin
  perform public.assert_current_user_admin();

  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'User not found';
  end if;

  if not exists (select 1 from public.profiles p where p.user_id = p_user_id) then
    select coalesce(nullif(split_part(u.email, '@', 1), ''), 'Member')
    into v_profile_name
    from auth.users u
    where u.id = p_user_id;

    insert into public.profiles (user_id, name, profile_type)
    values (p_user_id, v_profile_name, 'individual');
  end if;

  if not p_is_admin then
    select count(*)
    into v_admin_count
    from public.profiles
    where is_admin = true;

    if v_admin_count <= 1 and exists (
      select 1 from public.profiles p where p.user_id = p_user_id and p.is_admin = true
    ) then
      return jsonb_build_object('updated', false, 'reason', 'last_admin');
    end if;
  end if;

  update public.profiles
  set is_admin = p_is_admin
  where user_id = p_user_id;

  perform public.log_admin_action(
    case when p_is_admin then 'grant_admin_access' else 'revoke_admin_access' end,
    'user',
    p_user_id,
    jsonb_build_object('is_admin', p_is_admin)
  );

  return jsonb_build_object(
    'updated', true,
    'isAdmin', p_is_admin
  );
end;
$$;

grant execute on function public.admin_set_user_admin(uuid, boolean) to authenticated;
