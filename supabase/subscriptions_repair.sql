-- Run in Supabase SQL Editor if new members are not getting their 30-day free trial.
-- Safe to re-run. Does not remove active paid subscriptions.
--
-- If you have never run subscriptions.sql, run that file first, then run this file.
--
-- After running, check the results table at the bottom — each user should show
-- status = trialing and trial_active = true.

-- Recreate provision helper (idempotent)
create or replace function public.provision_member_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.member_subscriptions%rowtype;
begin
  select *
  into v_subscription
  from public.member_subscriptions
  where user_id = p_user_id;

  if not found then
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
    );
    return;
  end if;

  if v_subscription.status = 'active'
    and (v_subscription.current_period_end is null or v_subscription.current_period_end > now()) then
    return;
  end if;

  if v_subscription.status = 'past_due' then
    return;
  end if;

  if v_subscription.status = 'trialing' and v_subscription.trial_ends_at > now() then
    return;
  end if;

  return;
end;
$$;

-- Insert missing trials for accounts that never got a subscription row
insert into public.member_subscriptions (
  user_id,
  plan_type,
  status,
  trial_started_at,
  trial_ends_at
)
select
  u.id,
  coalesce(p.profile_type, 'individual'),
  'trialing',
  now(),
  now() + interval '30 days'
from auth.users u
left join public.profiles p on p.user_id = u.id
where not exists (
  select 1
  from public.member_subscriptions ms
  where ms.user_id = u.id
)
on conflict (user_id) do nothing;

-- Reset lapsed trials (keeps active paid and current trials untouched)
update public.member_subscriptions ms
set
  plan_type = coalesce(
    (select p.profile_type from public.profiles p where p.user_id = ms.user_id),
    ms.plan_type
  ),
  status = 'trialing',
  trial_started_at = now(),
  trial_ends_at = now() + interval '30 days',
  updated_at = now()
where not (
  ms.status = 'active'
  and (ms.current_period_end is null or ms.current_period_end > now())
)
and not (ms.status = 'past_due')
and not (ms.status = 'trialing' and ms.trial_ends_at > now());

-- Verify
select
  u.email,
  ms.status,
  ms.trial_ends_at,
  ms.trial_ends_at > now() as trial_active,
  public.has_active_member_access(u.id) as has_access
from auth.users u
left join public.member_subscriptions ms on ms.user_id = u.id
order by u.created_at desc
limit 25;
