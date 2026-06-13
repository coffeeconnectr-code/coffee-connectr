import { Link } from 'react-router-dom'
import useBrowseProfiles from '../hooks/useBrowseProfiles'
import BrowseFilters from './BrowseFilters'
import BrowseMap from './BrowseMap'

function profilesWithLocation(profiles) {
  return profiles.filter((profile) => profile.latitude != null && profile.longitude != null)
}

export default function DiscoverMap() {
  const {
    search,
    setSearch,
    category,
    setCategory,
    profileType,
    setProfileType,
    results,
    loading,
    error,
  } = useBrowseProfiles()

  const onMap = profilesWithLocation(results)
  const missingLocation = results.length - onMap.length

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Discover on map</h2>
          <p className="status-message">
            See where coffee professionals and businesses are located around the world.
          </p>
        </div>
        <div className="discover-header-actions">
          <Link to="/discover" className="secondary-button profile-action-link">
            List view
          </Link>
          <Link to="/discover/roasters" className="secondary-button profile-action-link">
            Find roasters
          </Link>
        </div>
      </div>

      <BrowseFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        profileType={profileType}
        onProfileTypeChange={setProfileType}
      />

      {loading ? <p className="status-message">Loading members...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error ? (
        <p className="status-message">
          {onMap.length} member{onMap.length === 1 ? '' : 's'} on map
          {missingLocation > 0
            ? ` (${missingLocation} without a map location hidden)`
            : ''}
        </p>
      ) : null}

      {!loading && !error && onMap.length === 0 ? (
        <p className="status-message">
          No members with a map location match those filters yet.
        </p>
      ) : null}

      {!loading && !error && onMap.length > 0 ? <BrowseMap profiles={results} /> : null}
    </section>
  )
}
