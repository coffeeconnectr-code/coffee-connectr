import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE_URL, applyCoffeeMapTheme, createMapPinElement } from '../lib/mapTheme'
import { getCategoryIcon } from '../lib/profileConstants'

function createJoinPopup() {
  const popup = document.createElement('div')
  popup.className = 'browse-map-popup browse-map-popup-preview'

  const message = document.createElement('p')
  message.className = 'browse-map-popup-category'
  message.textContent = 'Join Coffee Connectr to view member profiles and connect.'
  popup.appendChild(message)

  const link = document.createElement('a')
  link.href = '/sign-up'
  link.className = 'browse-map-popup-link'
  link.textContent = 'Sign up free'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    window.history.pushState({}, '', link.href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  popup.appendChild(link)

  return popup
}

function createPopupContent(profile) {
  const popup = document.createElement('div')
  popup.className = 'browse-map-popup'

  const name = document.createElement('p')
  name.className = 'browse-map-popup-name'
  name.textContent = profile.name ?? 'Member'
  popup.appendChild(name)

  if (profile.is_verified) {
    const verified = document.createElement('p')
    verified.className = 'browse-map-popup-category'
    verified.textContent = '✓ Verified member'
    popup.appendChild(verified)
  }

  if (profile.location) {
    const location = document.createElement('p')
    location.className = 'browse-map-popup-location'
    location.textContent = profile.location
    popup.appendChild(location)
  }

  if (profile.primary_category) {
    const category = document.createElement('p')
    category.className = 'browse-map-popup-category'
    category.textContent = `${getCategoryIcon(profile.primary_category)} ${profile.primary_category}`
    popup.appendChild(category)
  }

  const link = document.createElement('a')
  link.href = `/profile/${profile.user_id}`
  link.className = 'browse-map-popup-link'
  link.textContent = 'View profile'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    window.history.pushState({}, '', link.href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  popup.appendChild(link)

  return popup
}

export default function BrowseMap({ profiles, previewMode = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const locatedProfiles = useMemo(
    () => profiles.filter((profile) => profile.latitude != null && profile.longitude != null),
    [profiles],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [0, 20],
      zoom: 2,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      applyCoffeeMapTheme(map)
    })

    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const updateMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      locatedProfiles.forEach((profile) => {
        const marker = new maplibregl.Marker({
          element: createMapPinElement(profile.primary_category),
        })
          .setLngLat([profile.longitude, profile.latitude])

        if (previewMode) {
          marker.setPopup(
            new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(createJoinPopup()),
          )
        } else {
          marker.setPopup(
            new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(
              createPopupContent(profile),
            ),
          )
        }

        marker.addTo(map)

        markersRef.current.push(marker)
      })

      if (locatedProfiles.length === 1) {
        const profile = locatedProfiles[0]
        map.easeTo({
          center: [profile.longitude, profile.latitude],
          zoom: 10,
          duration: 500,
        })
        return
      }

      if (locatedProfiles.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        locatedProfiles.forEach((profile) => {
          bounds.extend([profile.longitude, profile.latitude])
        })

        map.fitBounds(bounds, {
          padding: 60,
          maxZoom: 12,
          duration: 500,
        })
      }
    }

    if (map.isStyleLoaded()) {
      updateMarkers()
    } else {
      map.once('load', updateMarkers)
    }
  }, [locatedProfiles, previewMode])

  return (
    <div className="map-shell browse-map-shell">
      <div ref={containerRef} className="coffee-map browse-map" />
    </div>
  )
}
