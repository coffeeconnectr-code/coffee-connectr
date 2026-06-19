export function parseRecommendationStats(data) {
  return {
    submissionsCount: Number(data?.submissionsCount ?? data?.submissions_count ?? 0),
    successfulSignups: Number(data?.successfulSignups ?? data?.successful_signups ?? 0),
    rewardMonthsEarned: Number(data?.rewardMonthsEarned ?? data?.reward_months_earned ?? 0),
    rewardMonthsGranted: Number(data?.rewardMonthsGranted ?? data?.reward_months_granted ?? 0),
    signupsUntilNextReward: Number(
      data?.signupsUntilNextReward ?? data?.signups_until_next_reward ?? 5,
    ),
  }
}

export function formatRecommendationSummary(stats) {
  if (!stats) {
    return null
  }

  const submissionLabel = `${stats.submissionsCount} recommendation${stats.submissionsCount === 1 ? '' : 's'} submitted`
  const signupLabel = `${stats.successfulSignups} joined`

  if (stats.rewardMonthsGranted > 0) {
    const monthLabel = stats.rewardMonthsGranted === 1 ? 'month' : 'months'
    return `${submissionLabel} · ${signupLabel} · ${stats.rewardMonthsGranted} bonus ${monthLabel} earned`
  }

  if (stats.successfulSignups > 0) {
    const remaining = stats.signupsUntilNextReward
    return `${submissionLabel} · ${signupLabel} · ${remaining} more join${remaining === 1 ? 's' : ''} until your next free month`
  }

  return `${submissionLabel} · Recommend 5 businesses that join to earn a free month`
}

export function formatRecommendationProgress(stats) {
  if (!stats || stats.successfulSignups === 0) {
    return 'Every 5 recommendations that sign up earns you 1 extra free month of membership.'
  }

  const remaining = stats.signupsUntilNextReward
  if (remaining === 5 && stats.successfulSignups % 5 === 0) {
    return 'You just earned another free month. Keep recommending to earn more.'
  }

  return `${remaining} more successful recommendation${remaining === 1 ? '' : 's'} until your next free month.`
}
