import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminDeleteListing,
  adminDeleteProfile,
  adminHideListing,
  adminHideProfile,
  adminSuspendUser,
  fetchAdminListings,
  fetchAdminProfiles,
} from '../../lib/adminApi'

function ActionButton({ label, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`secondary-button${danger ? ' profile-danger-button' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default function AdminModeration() {
  const [tab, setTab] = useState('profiles')
  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    setActionError('')

    try {
      if (tab === 'profiles') {
        setProfiles(await fetchAdminProfiles(search))
      } else {
        setListings(await fetchAdminListings(search))
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) {
        void loadData()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [tab])

  async function runAction(action) {
    setActionError('')

    try {
      await action()
      await loadData()
    } catch (actionErr) {
      setActionError(actionErr.message)
    }
  }

  return (
    <div className="admin-panel">
      <h3>Moderation</h3>

      <div className="admin-tab-row">
        <button
          type="button"
          className={`noticeboard-pill${tab === 'profiles' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => setTab('profiles')}
        >
          Profiles
        </button>
        <button
          type="button"
          className={`noticeboard-pill${tab === 'listings' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => setTab('listings')}
        >
          Listings
        </button>
      </div>

      <div className="admin-search-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, title, or location"
        />
        <button type="button" className="secondary-button" onClick={loadData}>
          Search
        </button>
      </div>

      {loading ? <p className="status-message">Loading...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}
      {actionError ? <p className="status-message profile-error">{actionError}</p> : null}

      {tab === 'profiles' ? (
        <div className="admin-table">
          {profiles.map((profile) => (
            <article key={profile.user_id} className="admin-row">
              <div>
                <strong>{profile.name}</strong>
                <p className="browse-meta">
                  {profile.location || 'No location'}
                  {profile.is_hidden ? ' · Hidden' : ''}
                  {profile.is_suspended ? ' · Suspended' : ''}
                  {profile.is_verified ? ' · Verified' : ''}
                  {profile.is_featured ? ' · Featured' : ''}
                  {profile.is_admin ? ' · Admin' : ''}
                </p>
              </div>
              <div className="admin-row-actions">
                <Link
                  to={`/profile/${profile.user_id}`}
                  className="secondary-button profile-action-link"
                >
                  View
                </Link>
                <ActionButton
                  label={profile.is_hidden ? 'Unhide' : 'Hide'}
                  onClick={() =>
                    runAction(() => adminHideProfile(profile.user_id, !profile.is_hidden))
                  }
                />
                <ActionButton
                  label={profile.is_suspended ? 'Unsuspend' : 'Suspend'}
                  onClick={() =>
                    runAction(() => adminSuspendUser(profile.user_id, !profile.is_suspended))
                  }
                />
                <ActionButton
                  label="Delete"
                  danger
                  onClick={() => {
                    if (window.confirm(`Delete profile for ${profile.name}?`)) {
                      runAction(() => adminDeleteProfile(profile.user_id))
                    }
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-table">
          {listings.map((listing) => (
            <article key={listing.id} className="admin-row">
              <div>
                <strong>{listing.title}</strong>
                <p className="browse-meta">
                  {listing.section}
                  {listing.is_hidden ? ' · Hidden' : ''}
                  {listing.location ? ` · ${listing.location}` : ''}
                </p>
              </div>
              <div className="admin-row-actions">
                <Link
                  to={`/noticeboard/${listing.id}`}
                  className="secondary-button profile-action-link"
                >
                  View
                </Link>
                <ActionButton
                  label={listing.is_hidden ? 'Unhide' : 'Hide'}
                  onClick={() =>
                    runAction(() => adminHideListing(listing.id, !listing.is_hidden))
                  }
                />
                <ActionButton
                  label="Delete"
                  danger
                  onClick={() => {
                    if (window.confirm(`Delete listing "${listing.title}"?`)) {
                      runAction(() => adminDeleteListing(listing.id))
                    }
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
