import { Link } from 'react-router-dom'
import useMapProfiles from '../hooks/useMapProfiles'
import BrowseFilters from './BrowseFilters'
import BrowseMap from './BrowseMap'

function profilesWithLocation(profiles) {
  return profiles.filter((profile) => profile.latitude != null && profile.longitude != null)
}

export default function DiscoverMap({ session }) {
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
    previewMode,
  } = useMapProfiles(session)

  const onMap = profilesWithLocation(results)
  const missingLocation = results.length - onMap.length

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Discover on map</h2>
          <p className="status-message">
            {previewMode
              ? 'Preview where coffee professionals and businesses are located around the world.'
              : 'See where coffee professionals and businesses are located around the world.'}
          </p>
        </div>
        {previewMode ? (
          <div className="discover-header-actions">
            <Link to="/sign-up" className="primary-button profile-action-link">
              Join to explore
            </Link>
          </div>
        ) : (
          <div className="discover-header-actions">
            <Link to="/discover" className="secondary-button profile-action-link">
              List view
            </Link>
            <Link to="/discover/roasters" className="secondary-button profile-action-link">
              Find roasters
            </Link>
          </div>
        )}
      </div>

      {previewMode ? (
        <p className="status-message member-preview-banner">
          Map preview only. Sign up for a free trial to view member profiles, message people, and
          use the full platform.
        </p>
      ) : null}

      <BrowseFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        profileType={profileType}
        onProfileTypeChange={setProfileType}
        hideSearch={previewMode}
      />

      {loading ? <p className="status-message">Loading members...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error ? (
        <p className="status-message">
          {onMap.length} member{onMap.length === 1 ? '' : 's'} on map
          {!previewMode && missingLocation > 0
            ? ` (${missingLocation} without a map location hidden)`
            : ''}
        </p>
      ) : null}

      {!loading && !error && onMap.length === 0 ? (
        <p className="status-message">
          No members with a map location match those filters yet.
        </p>
      ) : null}

      {!loading && !error && onMap.length > 0 ? (
        <BrowseMap profiles={results} previewMode={previewMode} />
      ) : null}
    </section>
  )
}
