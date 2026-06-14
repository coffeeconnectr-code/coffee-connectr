import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchFavouriteIds } from '../lib/favouritesApi'
import useBrowseProfiles from '../hooks/useBrowseProfiles'
import BrowseFilters from './BrowseFilters'
import ProfileBrowseCard from './ProfileBrowseCard'

export default function DiscoverBrowse({ currentUserId = null }) {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? ''

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
  } = useBrowseProfiles(initialCategory)

  const [favouriteIds, setFavouriteIds] = useState(new Set())

  useEffect(() => {
    let active = true

    async function loadFavourites() {
      if (!currentUserId) {
        if (active) {
          setFavouriteIds(new Set())
        }
        return
      }

      try {
        const ids = await fetchFavouriteIds(currentUserId)
        if (active) {
          setFavouriteIds(ids)
        }
      } catch {
        if (active) {
          setFavouriteIds(new Set())
        }
      }
    }

    loadFavourites()

    return () => {
      active = false
    }
  }, [currentUserId])

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Discover members</h2>
          <p className="status-message">
            Browse coffee professionals and businesses across the community.
          </p>
        </div>
        <div className="discover-header-actions">
          <Link to="/discover/map" className="secondary-button profile-action-link">
            Map view
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
          {results.length} member{results.length === 1 ? '' : 's'} found
        </p>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className="status-message">No members match those filters yet.</p>
      ) : null}

      <div className="browse-grid">
        {results.map((profile) => (
          <ProfileBrowseCard
            key={profile.id}
            profile={profile}
            currentUserId={currentUserId}
            initialSaved={favouriteIds.has(profile.user_id)}
          />
        ))}
      </div>
    </section>
  )
}
