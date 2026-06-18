import { supabase } from './supabase'
import { isProfileListed } from './profileCompletion'

const BROWSE_PROFILE_SELECT = `
  id, user_id, name, profile_type, profile_photo_url, cover_image_url,
  location, latitude, longitude, primary_category, secondary_categories,
  about_bio, website, linkedin_url, instagram_url,
  job_title_role, years_of_experience, skills_specialties, certifications,
  open_to_status, languages, business_type, year_established, team_size,
  services_offered, opening_hours, is_verified, is_featured, is_profile_complete,
  profile_sites(id, site_name, location, latitude, longitude, sort_order)
`

export async function browsePublicMapPins({ category = '', profileType = '' } = {}) {
  const { data, error } = await supabase.rpc('get_public_map_pins', {
    p_category: category,
    p_profile_type: profileType,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function browseProfiles({ search = '', category = '', profileType = '' } = {}) {
  let query = supabase
    .from('profiles')
    .select(BROWSE_PROFILE_SELECT)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })

  if (profileType) {
    query = query.eq('profile_type', profileType)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let results = (data ?? []).filter(isProfileListed)

  if (category) {
    results = results.filter(
      (profile) =>
        profile.primary_category === category ||
        (profile.secondary_categories ?? []).includes(category),
    )
  }

  const queryText = search.trim().toLowerCase()

  if (queryText) {
    const terms = queryText.split(/\s+/).filter(Boolean)

    results = results.filter((profile) => {
      const searchable = [profile.name, profile.location, profile.about_bio, profile.primary_category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return terms.every((term) => searchable.includes(term))
    })
  }

  return sortBrowseProfiles(results)
}

export function sortBrowseProfiles(profiles) {
  return [...profiles].sort((left, right) => {
    if (Boolean(left.is_featured) !== Boolean(right.is_featured)) {
      return left.is_featured ? -1 : 1
    }

    return (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
  })
}
