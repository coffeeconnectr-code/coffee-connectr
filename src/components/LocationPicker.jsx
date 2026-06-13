import { useEffect, useState } from 'react'
import { reverseGeocode, searchLocation } from '../lib/geocoding'
import CoffeeMap from './CoffeeMap'

export default function LocationPicker({ location, latitude, longitude, primaryCategory, onChange }) {
  const [searchQuery, setSearchQuery] = useState(location ?? '')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSearchQuery(location ?? '')
  }, [location])

  const hasPin = latitude != null && longitude != null

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
        <CoffeeMap
          latitude={hasPin ? latitude : null}
          longitude={hasPin ? longitude : null}
          category={primaryCategory}
          className="location-map"
          interactive
          scrollZoom
          showMarker={hasPin}
          draggableMarker
          onLocationPick={handleMapPick}
          onMarkerDragEnd={handleMapPick}
        />
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
