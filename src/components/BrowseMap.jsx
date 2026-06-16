import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE_URL, applyCoffeeMapTheme, createBrowseMapPinElement, createMapPinCountElement } from '../lib/mapTheme'
import { groupMapPins, profilesToMapPins } from '../lib/mapPins'
import CategoryLabel from './CategoryLabel'
import FeaturedBadge from './FeaturedBadge'
import VerifiedBadge from './VerifiedBadge'

const LOCATION_PRECISION = 5

function groupKey(group) {
  return `${Number(group.latitude).toFixed(LOCATION_PRECISION)},${Number(group.longitude).toFixed(LOCATION_PRECISION)}`
}

function formatPinLabel(pin) {
  return pin.site_name ? `${pin.name} — ${pin.site_name}` : (pin.name ?? 'Member')
}

function pinListKey(pin) {
  return `${pin.user_id ?? 'preview'}-${pin.site_name ?? 'main'}-${pin.latitude}-${pin.longitude}`
}

function BrowseMapSidebar({ group, previewMode, onClear }) {
  if (!group) {
    return (
      <aside className="browse-map-sidebar browse-map-sidebar-empty">
        <p className="browse-map-sidebar-title">Selected location</p>
        <p className="status-message">Click a pin to see members at that location.</p>
      </aside>
    )
  }

  const sharedLocation = group.pins.find((pin) => pin.location)?.location

  if (previewMode) {
    return (
      <aside className="browse-map-sidebar">
        <div className="browse-map-sidebar-header">
          <div>
            <p className="browse-map-sidebar-title">Location preview</p>
            <h3 className="browse-map-sidebar-heading">
              {group.count} member{group.count === 1 ? '' : 's'} here
            </h3>
            {sharedLocation ? <p className="browse-meta">{sharedLocation}</p> : null}
          </div>
          <button type="button" className="text-button" onClick={onClear}>
            Clear
          </button>
        </div>
        <p className="status-message">
          Join Coffee Connectr to view member profiles and connect with the community.
        </p>
        <Link to="/sign-up" className="primary-button profile-action-link">
          Sign up free
        </Link>
      </aside>
    )
  }

  return (
    <aside className="browse-map-sidebar">
      <div className="browse-map-sidebar-header">
        <div>
          <p className="browse-map-sidebar-title">
            {group.count > 1 ? `${group.count} members at this location` : 'Member at this location'}
          </p>
          {sharedLocation ? <p className="browse-meta">{sharedLocation}</p> : null}
        </div>
        <button type="button" className="text-button" onClick={onClear}>
          Clear
        </button>
      </div>

      <ul className="browse-map-profile-list">
        {group.pins.map((pin) => (
          <li key={pinListKey(pin)}>
            <Link to={`/profile/${pin.user_id}`} className="browse-map-profile-item">
              <div className="browse-map-profile-item-copy">
                <strong>{formatPinLabel(pin)}</strong>
                {pin.location && pin.site_name ? (
                  <p className="browse-meta">{pin.location}</p>
                ) : null}
                {pin.primary_category ? (
                  <span className="tag tag-primary">
                    <CategoryLabel category={pin.primary_category} />
                  </span>
                ) : null}
                <span className="browse-map-profile-badges">
                  {pin.is_featured ? <FeaturedBadge compact /> : null}
                  {pin.is_verified ? <VerifiedBadge compact /> : null}
                </span>
              </div>
              <span className="browse-map-profile-item-action">View profile</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default function BrowseMap({ profiles, previewMode = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [selectedGroupKey, setSelectedGroupKey] = useState(null)

  const pinGroups = useMemo(() => groupMapPins(profilesToMapPins(profiles)), [profiles])

  const selectedGroup = useMemo(
    () => pinGroups.find((group) => groupKey(group) === selectedGroupKey) ?? null,
    [pinGroups, selectedGroupKey],
  )

  const activeGroupKey = selectedGroup ? groupKey(selectedGroup) : null

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
        const key = groupKey(group)
        const pinElement =
          group.count > 1
            ? createMapPinCountElement(group.count)
            : createBrowseMapPinElement(group.pins[0])

        if (key === activeGroupKey) {
          pinElement.classList.add('coffee-map-pin-selected')
        }

        const marker = new maplibregl.Marker({ element: pinElement }).setLngLat([
          group.longitude,
          group.latitude,
        ])

        pinElement.addEventListener('click', (event) => {
          event.stopPropagation()
          setSelectedGroupKey(key)
          map.easeTo({
            center: [group.longitude, group.latitude],
            zoom: Math.max(map.getZoom(), 10),
            duration: 500,
          })
        })

        marker.addTo(map)
        markersRef.current.push(marker)
      })

      if (pinGroups.length === 1 && !activeGroupKey) {
        const group = pinGroups[0]
        map.easeTo({
          center: [group.longitude, group.latitude],
          zoom: 10,
          duration: 500,
        })
        return
      }

      if (pinGroups.length > 1 && !activeGroupKey) {
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
  }, [pinGroups, previewMode, activeGroupKey])

  return (
    <div className="browse-map-layout">
      <div className="map-shell browse-map-shell">
        <div ref={containerRef} className="coffee-map browse-map" />
      </div>
      <BrowseMapSidebar
        group={selectedGroup}
        previewMode={previewMode}
        onClear={() => setSelectedGroupKey(null)}
      />
    </div>
  )
}
