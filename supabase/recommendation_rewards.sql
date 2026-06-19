-- Run in Supabase SQL Editor after business_recommendations.sql
-- Tracks successful recommendation sign-ups and grants bonus free months (1 month per 5 sign-ups).

alter table public.business_recommendations
add column if not exists signed_up_user_id uuid references auth.users (id) on delete set null,
add column if not exists signed_up_at timestamptz;

create index if not exists business_recommendations_pending_email_idx
on public.business_recommendations (lower(trim(email)))
where signed_up_user_id is null;

alter table public.member_subscriptions
add column if not exists recommendation_reward_months_granted integer not null default 0;

create or replace function public.grant_recommendation_reward_months(
  p_user_id uuid,
  p_months integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.member_subscriptions%rowtype;
  v_interval interval := make_interval(months => p_months);
begin
  if p_months <= 0 then
    return;
  end if;

  perform public.provision_member_subscription(p_user_id);

  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_subscription.status = 'active'
    and v_subscription.current_period_end is not null
    and v_subscription.current_period_end > now() then
    update public.member_subscriptions
    set
      current_period_end = v_subscription.current_period_end + v_interval,
      updated_at = now()
    where user_id = p_user_id;
    return;
  end if;

  update public.member_subscriptions
  set
    status = case
      when status in ('expired', 'canceled') then 'trialing'
      else status
    end,
    trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + v_interval,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.process_recommendation_rewards(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qualified_signups integer;
  v_months_earned integer;
  v_months_granted integer;
  v_months_to_grant integer;
begin
  select count(*)
  into v_qualified_signups
  from public.business_recommendations
  where recommended_by_user_id = p_user_id
    and signed_up_user_id is not null;

  v_months_earned := v_qualified_signups / 5;

  perform public.provision_member_subscription(p_user_id);

  select coalesce(recommendation_reward_months_granted, 0)
  into v_months_granted
  from public.member_subscriptions
  where user_id = p_user_id;

  v_months_to_grant := v_months_earned - v_months_granted;

  if v_months_to_grant <= 0 then
    return;
  end if;

  perform public.grant_recommendation_reward_months(p_user_id, v_months_to_grant);

  update public.member_subscriptions
  set recommendation_reward_months_granted = v_months_earned
  where user_id = p_user_id;
end;
$$;

create or replace function public.match_recommendation_on_signup(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recommendation_id uuid;
  v_referrer_user_id uuid;
  v_normalized_email text := lower(trim(p_email));
begin
  if v_normalized_email is null or v_normalized_email = '' then
    return;
  end if;

  select br.id, br.recommended_by_user_id
  into v_recommendation_id, v_referrer_user_id
  from public.business_recommendations br
  where lower(trim(br.email)) = v_normalized_email
    and br.signed_up_user_id is null
    and br.recommended_by_user_id <> p_user_id
  order by br.created_at asc
  limit 1;

  if v_recommendation_id is null then
    return;
  end if;

  update public.business_recommendations
  set
    signed_up_user_id = p_user_id,
    signed_up_at = now()
  where id = v_recommendation_id;

  perform public.process_recommendation_rewards(v_referrer_user_id);
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
  perform public.match_recommendation_on_signup(new.id, new.email);
  return new;
end;
$$;

create or replace function public.get_my_recommendation_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submissions integer := 0;
  v_successful_signups integer := 0;
  v_months_earned integer := 0;
  v_months_granted integer := 0;
  v_signups_until_next_reward integer := 5;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'submissionsCount', 0,
      'successfulSignups', 0,
      'rewardMonthsEarned', 0,
      'rewardMonthsGranted', 0,
      'signupsUntilNextReward', 5
    );
  end if;

  select count(*)
  into v_submissions
  from public.business_recommendations
  where recommended_by_user_id = v_user_id;

  select count(*)
  into v_successful_signups
  from public.business_recommendations
  where recommended_by_user_id = v_user_id
    and signed_up_user_id is not null;

  v_months_earned := v_successful_signups / 5;

  select coalesce(ms.recommendation_reward_months_granted, 0)
  into v_months_granted
  from public.member_subscriptions ms
  where ms.user_id = v_user_id;

  v_signups_until_next_reward := 5 - (v_successful_signups % 5);
  if v_signups_until_next_reward = 0 then
    v_signups_until_next_reward := 5;
  end if;

  return jsonb_build_object(
    'submissionsCount', v_submissions,
    'successfulSignups', v_successful_signups,
    'rewardMonthsEarned', v_months_earned,
    'rewardMonthsGranted', coalesce(v_months_granted, 0),
    'signupsUntilNextReward', v_signups_until_next_reward
  );
end;
$$;

grant execute on function public.get_my_recommendation_stats() to authenticated;
