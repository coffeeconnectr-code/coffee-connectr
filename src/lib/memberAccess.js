export function getPlanPriceLabel(planType) {
  if (planType === 'business') {
    return 'US$10 per month'
  }

  return 'US$5 per month'
}

export function getAccessSummary(access) {
  if (!access) {
    return null
  }

  if (access.isAdmin) {
    return 'Admin access'
  }

  if (access.hasAccess && access.status === 'trialing') {
    const days = access.daysRemaining
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
