import { supabase } from './supabase'

export const emptySite = {
  site_name: '',
  location: '',
  latitude: null,
  longitude: null,
}

export function sitesFromDatabase(rows = []) {
  if (!rows.length) {
    return [{ ...emptySite }]
  }

  return rows.map((site) => ({
    site_name: site.site_name ?? '',
    location: site.location ?? '',
    latitude: site.latitude ?? null,
    longitude: site.longitude ?? null,
  }))
}

export function normalizeSitesForSave(sites) {
  return sites
    .filter((site) => site.site_name?.trim())
    .map((site) => ({
      site_name: site.site_name.trim(),
      location: site.location?.trim() || null,
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
    }))
}

export async function saveProfileSites(profileId, sites) {
  const { error: deleteError } = await supabase
    .from('profile_sites')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) {
    throw deleteError
  }

  const validSites = normalizeSitesForSave(sites)

  if (!validSites.length) {
    return []
  }

  const rows = validSites.map((site, index) => ({
    profile_id: profileId,
    site_name: site.site_name,
    location: site.location,
    latitude: site.latitude,
    longitude: site.longitude,
    sort_order: index,
  }))

  const { data, error } = await supabase.from('profile_sites').insert(rows).select()

  if (error) {
    throw error
  }

  return data ?? []
}

export function summarizeBusinessLocations(sites = []) {
  const namedSites = sites.filter((site) => site.site_name?.trim())

  if (!namedSites.length) {
    return null
  }

  if (namedSites.length === 1) {
    const site = namedSites[0]
    return site.location?.trim() || site.site_name.trim()
  }

  return `${namedSites.length} sites`
}
