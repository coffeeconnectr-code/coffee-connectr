-- Run in Supabase SQL Editor if lifetime free or 1-year grants fail with:
-- null value in column "trial_ends_at" of relation "member_subscriptions" violates not-null constraint
--
-- trial_ends_at is NOT NULL on member_subscriptions; lifetime/active grants must not clear it.

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
    trial_ends_at = coalesce(trial_ends_at, now()),
    current_period_end = null,
    canceled_at = null,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

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
