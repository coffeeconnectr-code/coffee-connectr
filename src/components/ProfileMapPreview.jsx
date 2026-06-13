import CoffeeMap from './CoffeeMap'

export default function ProfileMapPreview({ latitude, longitude, location, primaryCategory }) {
  return (
    <div className="profile-map-preview">
      <CoffeeMap
        latitude={latitude}
        longitude={longitude}
        category={primaryCategory}
        className="profile-map"
        interactive={false}
        scrollZoom={false}
        showMarker
      />
      {location ? <p className="profile-map-label">{location}</p> : null}
    </div>
  )
}
