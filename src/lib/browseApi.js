import { supabase } from './supabase'

export async function browseProfiles({ search = '', category = '', profileType = '' } = {}) {
  let query = supabase
    .from('profiles')
    .select(
      'id, user_id, name, profile_type, profile_photo_url, location, primary_category, secondary_categories, about_bio, latitude, longitude',
    )
    .order('name', { ascending: true })

  if (profileType) {
    query = query.eq('profile_type', profileType)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let results = data ?? []

  if (category) {
    results = results.filter(
      (profile) =>
        profile.primary_category === category ||
        (profile.secondary_categories ?? []).includes(category),
    )
  }

  const queryText = search.trim().toLowerCase()

  if (queryText) {
    results = results.filter((profile) => {
      const searchable = [profile.name, profile.location, profile.about_bio, profile.primary_category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(queryText)
    })
  }

  return results
}
