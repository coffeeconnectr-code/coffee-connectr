-- Run in Supabase SQL Editor AFTER admin.sql, admin_phase2.sql, featured_profiles.sql,
-- free_profile_invites.sql, and admin_free_year_membership.sql
-- Lets admins grant lifetime free, featured, or verified status directly to existing members.

drop function if exists public.admin_list_members_for_membership_grant(text, integer);

create or replace function public.admin_list_members_for_membership_grant(
  p_search text default '',
  p_limit integer default 50
)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  profile_type text,
  subscription_status text,
  is_lifetime_free boolean,
  is_verified boolean,
  is_featured boolean,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
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
    coalesce(p.profile_type, 'unknown') as profile_type,
    coalesce(ms.status, 'none') as subscription_status,
    coalesce(ms.is_lifetime_free, false) as is_lifetime_free,
    coalesce(p.is_verified, false) as is_verified,
    coalesce(p.is_featured, false) as is_featured,
    ms.trial_ends_at,
    ms.current_period_end,
    u.created_at as user_created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.member_subscriptions ms on ms.user_id = u.id
  where
    p_search = ''
    or u.email ilike '%' || p_search || '%'
    or coalesce(p.name, '') ilike '%' || p_search || '%'
  order by u.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_grant_lifetime_free_membership(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.member_subscriptions%rowtype;
begin
  perform public.assert_current_user_admin();

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'Member not found';
  end if;

  perform public.provision_member_subscription(p_user_id);

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = p_user_id;

  if coalesce(v_subscription.is_lifetime_free, false) then
    return jsonb_build_object('granted', false, 'reason', 'already_lifetime');
  end if;

  perform public.grant_lifetime_free_membership(p_user_id);

  perform public.log_admin_action(
    'grant_lifetime_free_membership',
    'user',
    p_user_id,
    '{}'::jsonb
  );

  return jsonb_build_object('granted', true);
end;
$$;

create or replace function public.admin_grant_profile_featured(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
  ) then
    raise exception 'Member profile not found';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and coalesce(p.is_featured, false)
  ) then
    return jsonb_build_object('granted', false, 'reason', 'already_featured');
  end if;

  update public.profiles
  set is_featured = true
  where user_id = p_user_id;

  update public.featured_requests
  set
    status = 'approved',
    admin_reason = 'Granted directly by admin',
    reviewed_at = now()
  where user_id = p_user_id
    and status = 'pending';

  perform public.log_admin_action(
    'grant_featured',
    'user',
    p_user_id,
    '{}'::jsonb
  );

  return jsonb_build_object('granted', true);
end;
$$;

create or replace function public.admin_grant_profile_verified(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
  ) then
    raise exception 'Member profile not found';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and coalesce(p.is_verified, false)
  ) then
    return jsonb_build_object('granted', false, 'reason', 'already_verified');
  end if;

  update public.profiles
  set is_verified = true
  where user_id = p_user_id;

  update public.verification_requests
  set
    status = 'approved',
    admin_reason = 'Granted directly by admin',
    reviewed_at = now()
  where user_id = p_user_id
    and status = 'pending';

  perform public.log_admin_action(
    'grant_verified',
    'user',
    p_user_id,
    '{}'::jsonb
  );

  return jsonb_build_object('granted', true);
end;
$$;

grant execute on function public.admin_list_members_for_membership_grant(text, integer) to authenticated;

revoke all on function public.admin_grant_lifetime_free_membership(uuid) from public;
grant execute on function public.admin_grant_lifetime_free_membership(uuid) to authenticated;

revoke all on function public.admin_grant_profile_featured(uuid) from public;
grant execute on function public.admin_grant_profile_featured(uuid) to authenticated;

revoke all on function public.admin_grant_profile_verified(uuid) from public;
grant execute on function public.admin_grant_profile_verified(uuid) to authenticated;
