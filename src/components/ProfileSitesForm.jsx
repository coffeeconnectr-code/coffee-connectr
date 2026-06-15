import LocationPicker from './LocationPicker'
import { emptySite } from '../lib/profileSitesApi'

export default function ProfileSitesForm({ sites, primaryCategory, onSitesChange }) {
  function updateSite(index, updates) {
    onSitesChange(
      sites.map((site, siteIndex) => (siteIndex === index ? { ...site, ...updates } : site)),
    )
  }

  function addSite() {
    onSitesChange([...sites, { ...emptySite }])
  }

  function removeSite(index) {
    onSitesChange(sites.filter((_, siteIndex) => siteIndex !== index))
  }

  return (
    <fieldset className="form-section">
      <legend>Business sites</legend>
      <p className="field-hint">
        Add each location your business operates from. Every site gets its own name and map pin.
      </p>

      {sites.map((site, index) => (
        <div key={index} className="machine-card">
          <div className="machine-card-header">
            <strong>Site {index + 1}</strong>
            {sites.length > 1 ? (
              <button type="button" className="text-button" onClick={() => removeSite(index)}>
                Remove
              </button>
            ) : null}
          </div>

          <label>
            Site name
            <input
              type="text"
              value={site.site_name}
              onChange={(event) => updateSite(index, { site_name: event.target.value })}
              placeholder="e.g. Auckland roastery, Melbourne café"
              required
            />
          </label>

          <LocationPicker
            location={site.location}
            latitude={site.latitude}
            longitude={site.longitude}
            primaryCategory={primaryCategory}
            onChange={({ location, latitude, longitude }) => {
              updateSite(index, { location, latitude, longitude })
            }}
          />
        </div>
      ))}

      <button type="button" className="secondary-button" onClick={addSite}>
        Add another site
      </button>
    </fieldset>
  )
}
