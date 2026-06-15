import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  MAP_STYLE_URL,
  applyCoffeeMapTheme,
  createListingPinElement,
} from '../lib/mapTheme'
import {
  formatPostPrice,
  getSectionLabel,
} from '../lib/noticeboardConstants'

function createPopupContent(post, onNavigate) {
  const popup = document.createElement('div')
  popup.className = 'browse-map-popup'

  const section = document.createElement('p')
  section.className = 'browse-map-popup-category'
  section.textContent = getSectionLabel(post.section)
  popup.appendChild(section)

  const title = document.createElement('p')
  title.className = 'browse-map-popup-name'
  title.textContent = post.title
  popup.appendChild(title)

  if (post.location) {
    const location = document.createElement('p')
    location.className = 'browse-map-popup-location'
    location.textContent = post.location
    popup.appendChild(location)
  }

  const price = formatPostPrice(post)
  if (price) {
    const priceLine = document.createElement('p')
    priceLine.className = 'browse-map-popup-location'
    priceLine.textContent = price
    popup.appendChild(priceLine)
  }

  const link = document.createElement('a')
  link.href = `/noticeboard/${post.id}`
  link.className = 'browse-map-popup-link'
  link.textContent = 'View listing'
  link.addEventListener('click', (event) => {
    event.preventDefault()
    onNavigate(link.href)
  })
  popup.appendChild(link)

  return popup
}

export default function NoticeboardBrowseMap({ posts }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const locatedPosts = useMemo(
    () => posts.filter((post) => post.latitude != null && post.longitude != null),
    [posts],
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

    const onNavigate = (path) => {
      navigate(path)
    }

    const updateMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      locatedPosts.forEach((post) => {
        const marker = new maplibregl.Marker({
          element: createListingPinElement(post.section),
        })
          .setLngLat([post.longitude, post.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 24, closeButton: false }).setDOMContent(
              createPopupContent(post, onNavigate),
            ),
          )
          .addTo(map)

        markersRef.current.push(marker)
      })

      if (locatedPosts.length === 1) {
        const post = locatedPosts[0]
        map.easeTo({
          center: [post.longitude, post.latitude],
          zoom: 10,
          duration: 500,
        })
        return
      }

      if (locatedPosts.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        locatedPosts.forEach((post) => {
          bounds.extend([post.longitude, post.latitude])
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
  }, [locatedPosts, navigate])

  return (
    <div className="map-shell browse-map-shell">
      <div ref={containerRef} className="coffee-map browse-map" />
    </div>
  )
}
