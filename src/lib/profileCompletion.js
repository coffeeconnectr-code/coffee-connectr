const SHARED_CHECKS = [
  { label: 'Name', test: (profile) => Boolean(profile.name?.trim()) },
  { label: 'Profile photo or logo', test: (profile) => Boolean(profile.profile_photo_url) },
  { label: 'Cover image', test: (profile) => Boolean(profile.cover_image_url) },
  { label: 'Location pin', test: (profile) => profile.latitude != null && profile.longitude != null },
  { label: 'Primary category', test: (profile) => Boolean(profile.primary_category) },
  {
    label: 'Secondary categories',
    test: (profile) => (profile.secondary_categories?.length ?? 0) > 0,
  },
  { label: 'About / bio', test: (profile) => Boolean(profile.about_bio?.trim()) },
  { label: 'Website or social link', test: (profile) => hasSocialLink(profile) },
]

const INDIVIDUAL_CHECKS = [
  { label: 'Job title / role', test: (profile) => Boolean(profile.job_title_role?.trim()) },
  { label: 'Years of experience', test: (profile) => profile.years_of_experience != null },
  {
    label: 'Skills / specialties',
    test: (profile) => (profile.skills_specialties?.length ?? 0) > 0,
  },
  { label: 'Certifications', test: (profile) => Boolean(profile.certifications?.trim()) },
  { label: 'Open-to status', test: (profile) => (profile.open_to_status?.length ?? 0) > 0 },
  { label: 'Languages', test: (profile) => (profile.languages?.length ?? 0) > 0 },
]

const BUSINESS_CHECKS = [
  { label: 'Business type', test: (profile) => Boolean(profile.business_type?.trim()) },
  { label: 'Year established', test: (profile) => profile.year_established != null },
  { label: 'Team size', test: (profile) => Boolean(profile.team_size?.trim()) },
  { label: 'Services offered', test: (profile) => Boolean(profile.services_offered?.trim()) },
  { label: 'Opening hours', test: (profile) => Boolean(profile.opening_hours?.trim()) },
]

function hasSocialLink(profile) {
  return Boolean(
    profile.website?.trim() || profile.linkedin_url?.trim() || profile.instagram_url?.trim(),
  )
}

export function getProfileCompletion(profile) {
  if (!profile) {
    return { percent: 0, missing: ['Create your profile'] }
  }

  const checks =
    profile.profile_type === 'business'
      ? [...SHARED_CHECKS, ...BUSINESS_CHECKS]
      : [...SHARED_CHECKS, ...INDIVIDUAL_CHECKS]

  const completed = checks.filter((check) => check.test(profile))
  const missing = checks.filter((check) => !check.test(profile)).map((check) => check.label)
  const percent = Math.round((completed.length / checks.length) * 100)

  return { percent, missing }
}

export function getSocialLinks(profile) {
  if (!profile) {
    return []
  }

  return [
    { label: 'Website', url: profile.website },
    { label: 'LinkedIn', url: profile.linkedin_url },
    { label: 'Instagram', url: profile.instagram_url },
  ].filter((link) => Boolean(link.url?.trim()))
}
