import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE_URL, applyCoffeeMapTheme, createBrowseMapPinElement, createMapPinCountElement } from '../lib/mapTheme'
import { groupMapPins, profilesToMapPins } from '../lib/mapPins'
import { getCategoryIcon } from '../lib/profileConstants'

function navigateTo(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function createJoinPopup(memberCount = 1) {
  const popup = document.createElement('div')
  popup.className = 'browse-map-popup browse-map-popup-preview'

  const message = document.createElement('p')
  message.className = 'browse-map-popup-category'
  message.textContent =
    memberCount > 1
      ? `${memberCount} members at this location. Join Coffee Connectr to view profiles and connect.`
      : 'Join Coffee Connectr to view member profiles and connect.'
  popup.appendChild(message)

  const link = document.createElement('a')
  link.href = '/sign-up'
  link.className = 'browse-map-popup-link'
  link.textContent = 'Sign up free'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateTo(link.href)
  })
  popup.appendChild(link)

  return popup
}

function formatPinLabel(pin) {
  return pin.site_name ? `${pin.name} — ${pin.site_name}` : (pin.name ?? 'Member')
}

function appendProfileLink(listItem, pin) {
  const link = document.createElement('a')
  link.href = `/profile/${pin.user_id}`
  link.className = 'browse-map-popup-profile-link'
  link.textContent = formatPinLabel(pin)
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateTo(link.href)
  })
  listItem.appendChild(link)

  if (pin.is_verified) {
    const verified = document.createElement('span')
    verified.className = 'browse-map-popup-verified'
    verified.textContent = '✓ Verified'
    listItem.appendChild(verified)
  }

  if (pin.is_featured) {
    const featured = document.createElement('span')
    featured.className = 'browse-map-popup-featured'
    featured.textContent = '★ Featured'
    listItem.appendChild(featured)
  }

  if (pin.primary_category) {
    const category = document.createElement('span')
    category.className = 'browse-map-popup-profile-category'
    category.textContent = `${getCategoryIcon(pin.primary_category)} ${pin.primary_category}`
    listItem.appendChild(category)
  }
}

function createPopupContent(pin) {
  const popup = document.createElement('div')
  popup.className = 'browse-map-popup'

  const name = document.createElement('p')
  name.className = 'browse-map-popup-name'
  name.textContent = formatPinLabel(pin)
  popup.appendChild(name)

  if (pin.is_verified) {
    const verified = document.createElement('p')
    verified.className = 'browse-map-popup-category'
    verified.textContent = '✓ Verified member'
    popup.appendChild(verified)
  }

  if (pin.is_featured) {
    const featured = document.createElement('p')
    featured.className = 'browse-map-popup-category'
    featured.textContent = '★ Featured member'
    popup.appendChild(featured)
  }

  if (pin.location) {
    const location = document.createElement('p')
    location.className = 'browse-map-popup-location'
    location.textContent = pin.location
    popup.appendChild(location)
  }

  if (pin.primary_category) {
    const category = document.createElement('p')
    category.className = 'browse-map-popup-category'
    category.textContent = `${getCategoryIcon(pin.primary_category)} ${pin.primary_category}`
    popup.appendChild(category)
  }

  const link = document.createElement('a')
  link.href = `/profile/${pin.user_id}`
  link.className = 'browse-map-popup-link'
  link.textContent = 'View profile'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    navigateTo(link.href)
  })
  popup.appendChild(link)

  return popup
}

function createGroupedPopupContent(group) {
  if (group.count === 1) {
    return createPopupContent(group.pins[0])
  }

  const popup = document.createElement('div')
  popup.className = 'browse-map-popup browse-map-popup-group'

  const heading = document.createElement('p')
  heading.className = 'browse-map-popup-name'
  heading.textContent = `${group.count} members at this location`
  popup.appendChild(heading)

  const sharedLocation = group.pins.find((pin) => pin.location)?.location
  if (sharedLocation) {
    const location = document.createElement('p')
    location.className = 'browse-map-popup-location'
    location.textContent = sharedLocation
    popup.appendChild(location)
  }

  const list = document.createElement('ul')
  list.className = 'browse-map-popup-profiles'

  group.pins.forEach((pin) => {
    const listItem = document.createElement('li')
    appendProfileLink(listItem, pin)
    list.appendChild(listItem)
  })

  popup.appendChild(list)
  return popup
}

export default function BrowseMap({ profiles, previewMode = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const pinGroups = useMemo(() => groupMapPins(profilesToMapPins(profiles)), [profiles])

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

      pinGroups.forEach((group) => {
        const marker = new maplibregl.Marker({
          element:
            group.count > 1
              ? createMapPinCountElement(group.count)
              : createBrowseMapPinElement(group.pins[0]),
        }).setLngLat([group.longitude, group.latitude])

        if (previewMode) {
          marker.setPopup(
            new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(
              createJoinPopup(group.count),
            ),
          )
        } else {
          marker.setPopup(
            new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(
              createGroupedPopupContent(group),
            ),
          )
        }

        marker.addTo(map)

        markersRef.current.push(marker)
      })

      if (pinGroups.length === 1) {
        const group = pinGroups[0]
        map.easeTo({
          center: [group.longitude, group.latitude],
          zoom: 10,
          duration: 500,
        })
        return
      }

      if (pinGroups.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        pinGroups.forEach((group) => {
          bounds.extend([group.longitude, group.latitude])
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
  }, [pinGroups, previewMode])

  return (
    <div className="map-shell browse-map-shell">
      <div ref={containerRef} className="coffee-map browse-map" />
    </div>
  )
}
