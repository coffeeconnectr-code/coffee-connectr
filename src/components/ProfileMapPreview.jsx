import CoffeeMap from './CoffeeMap'

export default function ProfileMapPreview({
  latitude,
  longitude,
  location,
  primaryCategory,
  sites = [],
}) {
  const locatedSites = sites.filter(
    (site) => site.latitude != null && site.longitude != null,
  )

  const mapPins =
    locatedSites.length > 0
      ? locatedSites.map((site) => ({
          latitude: site.latitude,
          longitude: site.longitude,
          category: primaryCategory,
          label: site.site_name,
        }))
      : latitude != null && longitude != null
        ? [
            {
              latitude,
              longitude,
              category: primaryCategory,
              label: location,
            },
          ]
        : []

  return (
    <div className="profile-map-preview">
      <CoffeeMap
        mapPins={mapPins}
        className="profile-map"
        interactive={false}
        scrollZoom={false}
        showMarker
      />
      {locatedSites.length > 0 ? (
        <ul className="profile-site-list">
          {locatedSites.map((site) => (
            <li key={site.id ?? `${site.site_name}-${site.latitude}`}>
              <strong>{site.site_name}</strong>
              {site.location ? <span>{site.location}</span> : null}
            </li>
          ))}
        </ul>
      ) : location ? (
        <p className="profile-map-label">{location}</p>
      ) : null}
    </div>
  )
}
