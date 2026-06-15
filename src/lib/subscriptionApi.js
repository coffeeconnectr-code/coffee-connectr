import { supabase } from './supabase'

const DEFAULT_ACCESS = {
  hasAccess: false,
  isAdmin: false,
  status: 'unknown',
  planType: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  daysRemaining: 0,
}

export async function fetchMemberAccess() {
  const { data, error } = await supabase.rpc('get_my_member_access')

  if (error) {
    throw error
  }

  return {
    hasAccess: Boolean(data?.hasAccess ?? data?.has_access),
    isAdmin: Boolean(data?.isAdmin ?? data?.is_admin),
    status: data?.status ?? DEFAULT_ACCESS.status,
    planType: data?.planType ?? data?.plan_type ?? null,
    trialEndsAt: data?.trialEndsAt ?? data?.trial_ends_at ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? data?.current_period_end ?? null,
    daysRemaining: Number(data?.daysRemaining ?? data?.days_remaining ?? 0),
  }
}
