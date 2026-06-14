-- Run in Supabase SQL Editor → New query → paste → Run
-- ORDER: Run AFTER profiles.sql, messages.sql, noticeboard.sql, favourites.sql, and admin.sql
--
-- Member access rules:
-- - New members get a 30-day free trial
-- - After trial: Individual US$5/month or Business US$10/month (billing via Stripe later)
-- - Expired members lose public visibility and cannot message, save, or post listings

-- ---------------------------------------------------------------------------
-- 1. Subscriptions table
-- ---------------------------------------------------------------------------

create table if not exists public.member_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_type text not null default 'individual' check (plan_type in ('individual', 'business')),
  status text not null default 'trialing' check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'expired')
  ),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  current_period_end timestamptz,
  canceled_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_subscriptions_status_idx on public.member_subscriptions (status);
create index if not exists member_subscriptions_trial_ends_at_idx on public.member_subscriptions (trial_ends_at);

drop trigger if exists member_subscriptions_set_updated_at on public.member_subscriptions;

create trigger member_subscriptions_set_updated_at
before update on public.member_subscriptions
for each row
execute function public.set_updated_at();

alter table public.member_subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.member_subscriptions;
create policy "Users can view own subscription"
on public.member_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all subscriptions" on public.member_subscriptions;
create policy "Admins can view all subscriptions"
on public.member_subscriptions
for select
to authenticated
using (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- 2. Provision trials for new signups
-- ---------------------------------------------------------------------------

create or replace function public.provision_member_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_subscriptions (
    user_id,
    plan_type,
    status,
    trial_started_at,
    trial_ends_at
  )
  values (
    p_user_id,
    'individual',
    'trialing',
    now(),
    now() + interval '30 days'
  )
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_member_subscription(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;

create trigger on_auth_user_created_subscription
after insert on auth.users
for each row
execute function public.handle_new_user_subscription();

-- Backfill existing accounts with a fresh 30-day trial window
insert into public.member_subscriptions (
  user_id,
  plan_type,
  status,
  trial_started_at,
  trial_ends_at
)
select
  id,
  'individual',
  'trialing',
  now(),
  now() + interval '30 days'
from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Keep plan type aligned with profile type
-- ---------------------------------------------------------------------------

create or replace function public.sync_subscription_plan_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_member_subscription(new.user_id);

  update public.member_subscriptions
  set plan_type = new.profile_type
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists profiles_sync_subscription_plan on public.profiles;

create trigger profiles_sync_subscription_plan
after insert or update of profile_type on public.profiles
for each row
execute function public.sync_subscription_plan_from_profile();

-- ---------------------------------------------------------------------------
-- 4. Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_user_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = check_user_id),
    false
  );
$$;

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
      'daysRemaining', 0
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
      'daysRemaining', null
    );
  end if;

  perform public.provision_member_subscription(v_user_id);

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = v_user_id;

  v_has_access := public.has_active_member_access(v_user_id);

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
    'daysRemaining', v_days_remaining
  );
end;
$$;

grant execute on function public.get_my_member_access() to authenticated;
grant execute on function public.has_active_member_access(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Enforce access in RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
on public.profiles
for select
to public
using (
  not is_hidden
  and not is_suspended
  and public.has_active_member_access(user_id)
);

drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
);

drop policy if exists "Members can create noticeboard posts" on public.noticeboard_posts;
create policy "Members can create noticeboard posts"
on public.noticeboard_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
);

drop policy if exists "Members can update own noticeboard posts" on public.noticeboard_posts;
create policy "Members can update own noticeboard posts"
on public.noticeboard_posts
for update
to authenticated
using (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
)
with check (
  auth.uid() = user_id
  and not public.is_user_suspended(auth.uid())
  and public.has_active_member_access(auth.uid())
);

drop policy if exists "Users can add favourites" on public.profile_favourites;
create policy "Users can add favourites"
on public.profile_favourites
for insert
to authenticated
with check (
  auth.uid() = user_id
  and user_id <> favourite_user_id
  and public.has_active_member_access(auth.uid())
);

-- ---------------------------------------------------------------------------
-- 6. Admin helper to activate paid access manually until Stripe is live
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_member_subscription(
  p_user_id uuid,
  p_plan_type text,
  p_status text,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_current_user_admin();

  if p_plan_type not in ('individual', 'business') then
    raise exception 'Invalid plan type';
  end if;

  if p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired') then
    raise exception 'Invalid subscription status';
  end if;

  perform public.provision_member_subscription(p_user_id);

  update public.member_subscriptions
  set
    plan_type = p_plan_type,
    status = p_status,
    current_period_end = p_current_period_end,
    canceled_at = case when p_status = 'canceled' then now() else canceled_at end,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- select public.get_my_member_access();
-- select user_id, plan_type, status, trial_ends_at from public.member_subscriptions limit 10;
