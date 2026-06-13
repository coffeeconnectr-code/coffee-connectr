function formatPhotonLocation(properties) {
  const parts = [
    properties.name,
    properties.street,
    properties.city,
    properties.state,
    properties.country,
  ]

  return [...new Set(parts.filter(Boolean))].join(', ')
}

function photonFeatureToLocation(feature) {
  const [longitude, latitude] = feature.geometry.coordinates

  return {
    location: formatPhotonLocation(feature.properties),
    latitude,
    longitude,
  }
}

export async function searchLocation(query) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Could not search for that location.')
  }

  const result = await response.json()
  const match = result.features?.[0]

  if (!match) {
    throw new Error('No location found. Try a city or address.')
  }

  return photonFeatureToLocation(match)
}

export async function reverseGeocode(latitude, longitude) {
  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Could not look up that map point.')
  }

  const result = await response.json()
  const match = result.features?.[0]

  if (!match) {
    return {
      location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
    }
  }

  return photonFeatureToLocation(match)
}
