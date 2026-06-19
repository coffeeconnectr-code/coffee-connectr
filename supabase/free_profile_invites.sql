-- Run in Supabase SQL Editor after subscriptions.sql
-- Free profile for life invites, lifetime membership flag, and redemption on sign-up.
--
-- Deploy edge function:
--   npx supabase functions deploy send-free-profile-invite --project-ref xfrgctnrafhhcfkcoplp

alter table public.member_subscriptions
add column if not exists is_lifetime_free boolean not null default false;

create table if not exists public.free_profile_invites (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null unique default gen_random_uuid(),
  contact_name text not null,
  email text not null,
  status text not null default 'contact' check (status in ('contact', 'invited', 'redeemed')),
  source text not null default 'admin' check (source in ('contact', 'admin')),
  contact_message text,
  created_at timestamptz not null default now(),
  invited_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  redeemed_user_id uuid references auth.users (id) on delete set null
);

create index if not exists free_profile_invites_email_idx
on public.free_profile_invites (lower(trim(email)), created_at desc);

create index if not exists free_profile_invites_status_idx
on public.free_profile_invites (status, created_at desc);

alter table public.free_profile_invites enable row level security;

grant select on public.free_profile_invites to authenticated;
grant all on public.free_profile_invites to service_role;

create or replace function public.grant_lifetime_free_membership(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_member_subscription(p_user_id);

  update public.member_subscriptions
  set
    is_lifetime_free = true,
    status = 'active',
    trial_ends_at = null,
    current_period_end = null,
    canceled_at = null,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.redeem_free_profile_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.free_profile_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  select u.email
  into v_user_email
  from auth.users u
  where u.id = v_user_id;

  select *
  into v_invite
  from public.free_profile_invites
  where invite_token::text = trim(p_token)
    and status = 'invited'
  for update;

  if not found then
    return jsonb_build_object('redeemed', false, 'reason', 'invalid_or_used_invite');
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(v_user_email)) then
    return jsonb_build_object('redeemed', false, 'reason', 'email_mismatch');
  end if;

  perform public.grant_lifetime_free_membership(v_user_id);

  update public.free_profile_invites
  set
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_user_id = v_user_id
  where id = v_invite.id;

  return jsonb_build_object('redeemed', true);
end;
$$;

grant execute on function public.redeem_free_profile_invite(text) to authenticated;

create or replace function public.has_active_member_access(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_user_admin(check_user_id) then true
    else coalesce(
      (
        select
          case
            when coalesce(ms.is_lifetime_free, false) then true
            when ms.status = 'trialing' and ms.trial_ends_at > now() then true
            when ms.status = 'active'
              and (ms.current_period_end is null or ms.current_period_end > now()) then true
            else false
          end
        from public.member_subscriptions ms
        where ms.user_id = check_user_id
      ),
      false
    )
  end;
$$;

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
    v_days_remaining := greatest(
      0,
      ceil(extract(epoch from (v_subscription.trial_ends_at - now())) / 86400)::integer
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

create or replace function public.admin_list_free_profile_invites(
  p_search text default '',
  p_status text default '',
  p_limit integer default 50
)
returns table (
  id uuid,
  invite_token uuid,
  contact_name text,
  email text,
  status text,
  source text,
  contact_message text,
  created_at timestamptz,
  invited_at timestamptz,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  return query
  select
    fpi.id,
    fpi.invite_token,
    fpi.contact_name,
    fpi.email,
    fpi.status,
    fpi.source,
    fpi.contact_message,
    fpi.created_at,
    fpi.invited_at,
    fpi.redeemed_at
  from public.free_profile_invites fpi
  where
    (
      p_status = ''
      or fpi.status = p_status
    )
    and (
      p_search = ''
      or fpi.email ilike '%' || p_search || '%'
      or fpi.contact_name ilike '%' || p_search || '%'
      or coalesce(fpi.contact_message, '') ilike '%' || p_search || '%'
    )
  order by fpi.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.admin_list_free_profile_invites(text, text, integer) to authenticated;
