import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { reverseGeocode, searchLocation } from '../lib/geocoding'
import 'leaflet/dist/leaflet.css'

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2
const PIN_ZOOM = 13

function MapRecenter({ latitude, longitude }) {
  const map = useMap()

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], PIN_ZOOM)
    }
  }, [latitude, longitude, map])

  return null
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

export default function LocationPicker({ location, latitude, longitude, onChange }) {
  const [searchQuery, setSearchQuery] = useState(location ?? '')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSearchQuery(location ?? '')
  }, [location])

  const hasPin = latitude != null && longitude != null

  const mapCenter = useMemo(
    () => (hasPin ? [latitude, longitude] : DEFAULT_CENTER),
    [hasPin, latitude, longitude],
  )

  const mapZoom = hasPin ? PIN_ZOOM : DEFAULT_ZOOM

  async function applyLocation(nextLocation) {
    onChange(nextLocation)
    setSearchQuery(nextLocation.location)
  }

  async function handleSearch() {
    const query = searchQuery.trim()

    if (!query) {
      return
    }

    setSearching(true)
    setError('')

    try {
      const result = await searchLocation(query)
      await applyLocation(result)
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setSearching(false)
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearch()
    }
  }

  async function handleMapPick(nextLatitude, nextLongitude) {
    setSearching(true)
    setError('')

    try {
      const result = await reverseGeocode(nextLatitude, nextLongitude)
      await applyLocation(result)
    } catch (pickError) {
      setError(pickError.message)
    } finally {
      setSearching(false)
    }
  }

  async function handleMarkerDrag(event) {
    const marker = event.target
    const position = marker.getLatLng()
    await handleMapPick(position.lat, position.lng)
  }

  function handleClearPin() {
    onChange({ location: '', latitude: null, longitude: null })
    setSearchQuery('')
    setError('')
  }

  return (
    <div className="location-picker">
      <span className="field-label">Location</span>

      <div className="location-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search city or address"
        />
        <button
          type="button"
          className="secondary-button"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? 'Finding...' : 'Find on map'}
        </button>
      </div>

      <p className="location-hint">Or click the map to drop a pin. Drag the pin to fine-tune.</p>

      <div className="map-shell">
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom className="location-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter latitude={latitude} longitude={longitude} />
          <MapClickHandler onPick={handleMapPick} />
          {hasPin ? (
            <Marker
              position={[latitude, longitude]}
              draggable
              eventHandlers={{ dragend: handleMarkerDrag }}
            />
          ) : null}
        </MapContainer>
      </div>

      {hasPin ? (
        <div className="location-summary">
          <p>{location}</p>
          <button type="button" className="text-button" onClick={handleClearPin}>
            Clear pin
          </button>
        </div>
      ) : (
        <p className="location-hint">No pin selected yet.</p>
      )}

      {error ? <p className="location-error">{error}</p> : null}
    </div>
  )
}
