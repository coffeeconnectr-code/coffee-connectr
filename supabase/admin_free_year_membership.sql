-- Run in Supabase SQL Editor after subscriptions.sql and free_profile_invites.sql
-- Lets admins grant a member 1 year of free active membership.

create table if not exists public.admin_membership_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  grant_type text not null default 'one_year_free' check (grant_type in ('one_year_free')),
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_membership_grants_user_id_idx
on public.admin_membership_grants (user_id, created_at desc);

alter table public.admin_membership_grants enable row level security;

grant all on public.admin_membership_grants to service_role;

create or replace function public.admin_grant_one_year_free_membership(
  p_user_id uuid,
  p_plan_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_type text;
  v_subscription public.member_subscriptions%rowtype;
  v_new_period_end timestamptz;
  v_plan_type text;
begin
  perform public.assert_current_user_admin();

  if p_plan_type is not null and p_plan_type not in ('individual', 'business') then
    raise exception 'Invalid plan type';
  end if;

  perform public.provision_member_subscription(p_user_id);

  select p.profile_type
  into v_profile_type
  from public.profiles p
  where p.user_id = p_user_id;

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = p_user_id;

  if not found then
    raise exception 'Could not provision subscription for user %', p_user_id;
  end if;

  if coalesce(v_subscription.is_lifetime_free, false) then
    return jsonb_build_object('granted', false, 'reason', 'already_lifetime');
  end if;

  v_new_period_end := greatest(
    coalesce(v_subscription.current_period_end, now()),
    coalesce(v_subscription.trial_ends_at, now()),
    now()
  ) + interval '1 year';

  v_plan_type := coalesce(
    nullif(p_plan_type, ''),
    nullif(v_profile_type, ''),
    v_subscription.plan_type,
    'individual'
  );

  update public.member_subscriptions
  set
    plan_type = v_plan_type,
    status = 'active',
    trial_ends_at = coalesce(v_subscription.trial_ends_at, now()),
    current_period_end = v_new_period_end,
    canceled_at = null,
    updated_at = now()
  where user_id = p_user_id;

  insert into public.admin_membership_grants (user_id, granted_by, period_end)
  values (p_user_id, auth.uid(), v_new_period_end);

  perform public.log_admin_action(
    'grant_one_year_free_membership',
    'user',
    p_user_id,
    jsonb_build_object(
      'plan_type', v_plan_type,
      'current_period_end', v_new_period_end
    )
  );

  return jsonb_build_object(
    'granted', true,
    'currentPeriodEnd', v_new_period_end,
    'planType', v_plan_type
  );
end;
$$;

grant execute on function public.admin_grant_one_year_free_membership(uuid, text) to authenticated;

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

grant execute on function public.admin_list_members_for_membership_grant(text, integer) to authenticated;

create or replace function public.get_my_member_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription public.member_subscriptions%rowtype;
  v_has_access boolean;
  v_days_remaining integer;
  v_period_end timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'hasAccess', false,
      'isAdmin', false,
      'status', 'anonymous',
      'planType', null,
      'trialEndsAt', null,
      'currentPeriodEnd', null,
      'daysRemaining', 0,
      'isLifetimeFree', false
    );
  end if;

  if public.is_user_admin(v_user_id) then
    return jsonb_build_object(
      'hasAccess', true,
      'isAdmin', true,
      'status', 'admin',
      'planType', null,
      'trialEndsAt', null,
      'currentPeriodEnd', null,
      'daysRemaining', null,
      'isLifetimeFree', false
    );
  end if;

  perform public.provision_member_subscription(v_user_id);

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = v_user_id;

  if not found then
    raise exception 'Could not provision member subscription for user %', v_user_id;
  end if;

  v_has_access := public.has_active_member_access(v_user_id);

  if coalesce(v_subscription.is_lifetime_free, false) then
    return jsonb_build_object(
      'hasAccess', true,
      'isAdmin', false,
      'status', 'lifetime',
      'planType', v_subscription.plan_type,
      'trialEndsAt', null,
      'currentPeriodEnd', null,
      'daysRemaining', null,
      'isLifetimeFree', true
    );
  end if;

  if v_subscription.status = 'trialing' and v_subscription.trial_ends_at > now() then
    v_period_end := v_subscription.trial_ends_at;
  elsif v_subscription.status = 'active'
    and v_subscription.current_period_end is not null
    and v_subscription.current_period_end > now() then
    v_period_end := v_subscription.current_period_end;
  else
    v_period_end := null;
  end if;

  if v_period_end is not null then
    v_days_remaining := greatest(
      0,
      ceil(extract(epoch from (v_period_end - now())) / 86400)::integer
    );
  else
    v_days_remaining := 0;
  end if;

  return jsonb_build_object(
    'hasAccess', v_has_access,
    'isAdmin', false,
    'status', v_subscription.status,
    'planType', v_subscription.plan_type,
    'trialEndsAt', v_subscription.trial_ends_at,
    'currentPeriodEnd', v_subscription.current_period_end,
    'daysRemaining', v_days_remaining,
    'isLifetimeFree', false
  );
end;
$$;
