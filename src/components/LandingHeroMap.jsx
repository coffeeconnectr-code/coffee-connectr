import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { browsePublicMapPins } from '../lib/browseApi'
import { MAP_STYLE_URL, applyCoffeeMapTheme, createMapPinElement } from '../lib/mapTheme'

export default function LandingHeroMap() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [pins, setPins] = useState([])

  useEffect(() => {
    let active = true

    browsePublicMapPins()
      .then((data) => {
        if (active) {
          setPins(data)
        }
      })
      .catch(() => {
        if (active) {
          setPins([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [12, 24],
      zoom: 1.35,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    })

    map.on('load', () => {
      applyCoffeeMapTheme(map)
    })

    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => {
      map.resize()
    })

    resizeObserver.observe(containerRef.current)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    let startTime = 0
    const startLongitude = 12
    const latitude = 24
    const rotationSeconds = 150

    const spinGlobe = (timestamp) => {
      if (!startTime) {
        startTime = timestamp
      }

      const elapsedSeconds = (timestamp - startTime) / 1000
      const longitude = startLongitude + (elapsedSeconds / rotationSeconds) * 360
      const normalizedLongitude = ((longitude + 180) % 360) - 180

      map.setCenter([normalizedLongitude, latitude])
      animationFrame = window.requestAnimationFrame(spinGlobe)
    }

    const startSpin = () => {
      if (!prefersReducedMotion) {
        animationFrame = window.requestAnimationFrame(spinGlobe)
      }
    }

    if (map.isStyleLoaded()) {
      startSpin()
    } else {
      map.once('load', startSpin)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
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

      pins.forEach((pin) => {
        if (pin.latitude == null || pin.longitude == null) {
          return
        }

        const marker = new maplibregl.Marker({
          element: createMapPinElement(pin.primary_category),
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
  }, [pins])

  return <div ref={containerRef} className="landing-hero-map" aria-hidden="true" />
}
