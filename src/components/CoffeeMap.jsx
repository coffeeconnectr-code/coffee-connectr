import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  MAP_STYLE_URL,
  applyCoffeeMapTheme,
  createMapPinElement,
  updateMapPinIcon,
} from '../lib/mapTheme'

export default function CoffeeMap({
  latitude,
  longitude,
  mapPins = [],
  zoom = 13,
  defaultCenter = [0, 20],
  defaultZoom = 2,
  className = '',
  interactive = true,
  scrollZoom = true,
  showMarker = false,
  draggableMarker = false,
  category = '',
  onLocationPick,
  onMarkerDragEnd,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const markersRef = useRef([])
  const onLocationPickRef = useRef(onLocationPick)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)

  const locatedPins = useMemo(
    () => mapPins.filter((pin) => pin.latitude != null && pin.longitude != null),
    [mapPins],
  )
  const useMultiPins = locatedPins.length > 0
  const hasSinglePin = !useMultiPins && latitude != null && longitude != null

  useEffect(() => {
    onLocationPickRef.current = onLocationPick
    onMarkerDragEndRef.current = onMarkerDragEnd
  }, [onLocationPick, onMarkerDragEnd])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: hasSinglePin ? [longitude, latitude] : defaultCenter,
      zoom: hasSinglePin ? zoom : defaultZoom,
      attributionControl: true,
      scrollZoom,
      dragPan: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoomRotate: interactive,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      applyCoffeeMapTheme(map)
    })

    if (interactive && onLocationPick) {
      map.on('click', (event) => {
        onLocationPickRef.current?.(event.lngLat.lat, event.lngLat.lng)
      })
    }

    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const moveToPins = () => {
      if (useMultiPins) {
        if (locatedPins.length === 1) {
          const pin = locatedPins[0]
          map.easeTo({
            center: [pin.longitude, pin.latitude],
            zoom,
            duration: 500,
          })
          return
        }

        const bounds = new maplibregl.LngLatBounds()
        locatedPins.forEach((pin) => {
          bounds.extend([pin.longitude, pin.latitude])
        })

        map.fitBounds(bounds, {
          padding: 48,
          maxZoom: zoom,
          duration: 500,
        })
        return
      }

      if (hasSinglePin) {
        map.easeTo({
          center: [longitude, latitude],
          zoom,
          duration: 500,
        })
      }
    }

    if (map.isStyleLoaded()) {
      moveToPins()
    } else {
      map.once('load', moveToPins)
    }
  }, [useMultiPins, hasSinglePin, locatedPins, latitude, longitude, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !showMarker) {
      return
    }

    if (useMultiPins) {
      markerRef.current?.remove()
      markerRef.current = null

      const updateMarkers = () => {
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        locatedPins.forEach((pin) => {
          const marker = new maplibregl.Marker({
            element: createMapPinElement(pin.category ?? category),
          })
            .setLngLat([pin.longitude, pin.latitude])
            .addTo(map)

          markersRef.current.push(marker)
        })
      }

      if (map.isStyleLoaded()) {
        updateMarkers()
      } else {
        map.once('load', updateMarkers)
      }

      return
    }

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (!hasSinglePin) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (!markerRef.current) {
      const marker = new maplibregl.Marker({
        element: createMapPinElement(category),
        draggable: draggableMarker,
      })
        .setLngLat([longitude, latitude])
        .addTo(map)

      if (draggableMarker) {
        marker.on('dragend', () => {
          const position = marker.getLngLat()
          onMarkerDragEndRef.current?.(position.lat, position.lng)
        })
      }

      markerRef.current = marker
      return
    }

    markerRef.current.setLngLat([longitude, latitude])
    markerRef.current.setDraggable(draggableMarker)
    updateMapPinIcon(markerRef.current.getElement(), category)
  }, [
    showMarker,
    draggableMarker,
    useMultiPins,
    hasSinglePin,
    locatedPins,
    latitude,
    longitude,
    category,
  ])

  return <div ref={containerRef} className={`coffee-map ${className}`.trim()} />
}
