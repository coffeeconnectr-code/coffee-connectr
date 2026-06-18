import { profileHasMapPin } from './mapPins'

export const PROFILE_LISTING_THRESHOLD = 0

const SHARED_CHECKS = [
  { label: 'Name', test: (profile) => Boolean(profile.name?.trim()) },
  { label: 'Profile photo or logo', test: (profile) => Boolean(profile.profile_photo_url) },
  { label: 'Cover image', test: (profile) => Boolean(profile.cover_image_url) },
  { label: 'Primary category', test: (profile) => Boolean(profile.primary_category) },
  {
    label: 'Secondary categories',
    test: (profile) => (profile.secondary_categories?.length ?? 0) > 0,
  },
  { label: 'About / bio', test: (profile) => Boolean(profile.about_bio?.trim()) },
  { label: 'Website', test: (profile) => Boolean(profile.website?.trim()) },
  { label: 'LinkedIn', test: (profile) => Boolean(profile.linkedin_url?.trim()) },
  { label: 'Instagram', test: (profile) => Boolean(profile.instagram_url?.trim()) },
  { label: 'Contact email', test: (profile) => Boolean(profile.contact_email?.trim()) },
  { label: 'Contact phone', test: (profile) => Boolean(profile.contact_phone?.trim()) },
]

const INDIVIDUAL_CHECKS = [
  { label: 'Location pin', test: (profile) => profileHasMapPin(profile) },
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
  {
    label: 'Business site with map pin',
    test: (profile) => hasCompleteBusinessSite(profile),
  },
  { label: 'Business type', test: (profile) => Boolean(profile.business_type?.trim()) },
  { label: 'Year established', test: (profile) => profile.year_established != null },
  { label: 'Team size', test: (profile) => Boolean(profile.team_size?.trim()) },
  { label: 'Services offered', test: (profile) => Boolean(profile.services_offered?.trim()) },
  { label: 'Opening hours', test: (profile) => Boolean(profile.opening_hours?.trim()) },
]

function hasCompleteBusinessSite(profile) {
  const sites = profile.profile_sites ?? []

  return sites.some(
    (site) =>
      site.site_name?.trim() &&
      site.location?.trim() &&
      site.latitude != null &&
      site.longitude != null,
  )
}

function getPublishChecks(profile) {
  if (!profile) {
    return []
  }

  return profile.profile_type === 'business'
    ? [...SHARED_CHECKS, ...BUSINESS_CHECKS]
    : [...SHARED_CHECKS, ...INDIVIDUAL_CHECKS]
}

export function getProfileCompletion(profile) {
  if (!profile) {
    return {
      percent: 0,
      missing: ['Create your profile'],
      isComplete: false,
      isListed: false,
    }
  }

  const checks = getPublishChecks(profile)
  const completed = checks.filter((check) => check.test(profile))
  const missing = checks.filter((check) => !check.test(profile)).map((check) => check.label)
  const percent = Math.round((completed.length / checks.length) * 100)

  return {
    percent,
    missing,
    isComplete: missing.length === 0,
    isListed: percent >= PROFILE_LISTING_THRESHOLD,
  }
}

export function isProfileListed(profile) {
  return Boolean(profile)
}

export function isProfileComplete(profile) {
  return getProfileCompletion(profile).isComplete
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
