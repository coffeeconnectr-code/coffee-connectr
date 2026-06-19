export function getTrialDaysRemaining(trialEndsAt, now = Date.now()) {
  if (!trialEndsAt) {
    return null
  }

  const endMs = new Date(trialEndsAt).getTime()
  if (Number.isNaN(endMs)) {
    return null
  }

  const diffMs = endMs - now
  if (diffMs <= 0) {
    return 0
  }

  return Math.ceil(diffMs / 86_400_000)
}

export function getPlanPriceLabel(planType) {
  if (planType === 'business') {
    return 'US$10 per month'
  }

  return 'US$5 per month'
}

export function getAccessSummary(access, now = Date.now()) {
  if (!access) {
    return null
  }

  if (access.isAdmin) {
    return 'Admin access'
  }

  if (access.isLifetimeFree || access.status === 'lifetime') {
    return 'Lifetime free profile'
  }

  if (access.hasAccess && access.status === 'trialing') {
    const days = getTrialDaysRemaining(access.trialEndsAt, now) ?? access.daysRemaining ?? 0

    if (days <= 0) {
      return 'Free trial — ends today'
    }

    if (days === 1) {
      return 'Free trial — 1 day left'
    }

    return `Free trial — ${days} days left`
  }

  if (access.hasAccess && access.status === 'active') {
    return `${access.planType === 'business' ? 'Business' : 'Individual'} plan active`
  }

  if (!access.hasAccess) {
    return 'Membership inactive — subscribe to restore access'
  }

  return null
}
