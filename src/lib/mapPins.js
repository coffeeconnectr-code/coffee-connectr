export function profileHasMapPin(profile) {
  if (!profile) {
    return false
  }

  if (profile.profile_type === 'business') {
    const profileSites = Array.isArray(profile.profile_sites) ? profile.profile_sites : []
    const hasSitePin = profileSites.some(
      (site) => site.latitude != null && site.longitude != null,
    )

    if (hasSitePin) {
      return true
    }

    return profile.latitude != null && profile.longitude != null
  }

  return profile.latitude != null && profile.longitude != null
}

export function profileToMapPins(profile) {
  if (!profile) {
    return []
  }

  if (profile.profile_type === 'business') {
    const profileSites = Array.isArray(profile.profile_sites) ? profile.profile_sites : []
    const sitePins = profileSites
      .filter((site) => site.latitude != null && site.longitude != null)
      .map((site) => ({
        latitude: site.latitude,
        longitude: site.longitude,
        primary_category: profile.primary_category,
        user_id: profile.user_id,
        name: profile.name,
        location: site.location,
        site_name: site.site_name,
        is_verified: profile.is_verified,
        profile_type: profile.profile_type,
      }))

    if (sitePins.length > 0) {
      return sitePins
    }

    if (profile.latitude == null || profile.longitude == null) {
      return []
    }

    return [
      {
        latitude: profile.latitude,
        longitude: profile.longitude,
        primary_category: profile.primary_category,
        user_id: profile.user_id,
        name: profile.name,
        location: profile.location,
        site_name: null,
        is_verified: profile.is_verified,
        profile_type: profile.profile_type,
      },
    ]
  }

  if (profile.latitude == null || profile.longitude == null) {
    return []
  }

  return [
    {
      latitude: profile.latitude,
      longitude: profile.longitude,
      primary_category: profile.primary_category,
      user_id: profile.user_id,
      name: profile.name,
      location: profile.location,
      site_name: null,
      is_verified: profile.is_verified,
      profile_type: profile.profile_type,
    },
  ]
}

export function profilesToMapPins(profiles) {
  if (!Array.isArray(profiles)) {
    return []
  }

  return profiles.flatMap((profile) => profileToMapPins(profile))
}
