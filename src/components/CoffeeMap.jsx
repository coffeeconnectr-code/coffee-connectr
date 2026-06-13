import { useEffect, useRef } from 'react'
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
  const onLocationPickRef = useRef(onLocationPick)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)

  const hasPin = latitude != null && longitude != null

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
      center: hasPin ? [longitude, latitude] : defaultCenter,
      zoom: hasPin ? zoom : defaultZoom,
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

    const moveToPin = () => {
      if (hasPin) {
        map.easeTo({
          center: [longitude, latitude],
          zoom,
          duration: 500,
        })
      }
    }

    if (map.isStyleLoaded()) {
      moveToPin()
    } else {
      map.once('load', moveToPin)
    }
  }, [hasPin, latitude, longitude, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (!showMarker || !hasPin) {
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
  }, [showMarker, draggableMarker, hasPin, latitude, longitude, category])

  return <div ref={containerRef} className={`coffee-map ${className}`.trim()} />
}
