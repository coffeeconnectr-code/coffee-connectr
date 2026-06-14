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
    hasAccess: Boolean(data?.hasAccess),
    isAdmin: Boolean(data?.isAdmin),
    status: data?.status ?? DEFAULT_ACCESS.status,
    planType: data?.planType ?? null,
    trialEndsAt: data?.trialEndsAt ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    daysRemaining: Number(data?.daysRemaining ?? 0),
  }
}
