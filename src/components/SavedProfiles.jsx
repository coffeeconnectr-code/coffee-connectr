import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSavedProfiles } from '../lib/favouritesApi'
import ProfileBrowseCard from './ProfileBrowseCard'

export default function SavedProfiles({ currentUserId }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSavedProfiles() {
      setLoading(true)
      setError('')

      try {
        const results = await fetchSavedProfiles(currentUserId)
        if (active) {
          setProfiles(results)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSavedProfiles()

    return () => {
      active = false
    }
  }, [currentUserId])

  function handleUnsave(profileUserId) {
    setProfiles((current) => current.filter((profile) => profile.user_id !== profileUserId))
  }

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Saved profiles</h2>
          <p className="status-message">
            Members and businesses you have saved for quick access later.
          </p>
        </div>
        <Link to="/discover" className="secondary-button profile-action-link">
          Discover members
        </Link>
      </div>

      {loading ? <p className="status-message">Loading saved profiles...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error ? (
        <p className="status-message">
          {profiles.length} saved profile{profiles.length === 1 ? '' : 's'}
        </p>
      ) : null}

      {!loading && !error && profiles.length === 0 ? (
        <div className="messages-empty">
          <p className="status-message">You have not saved any profiles yet.</p>
          <p className="status-message">
            Browse members and tap <strong>Save profile</strong> on anyone you want to keep.
          </p>
          <Link to="/discover" className="primary-button profile-action-link">
            Discover members
          </Link>
        </div>
      ) : null}

      <div className="browse-grid">
        {profiles.map((profile) => (
          <ProfileBrowseCard
            key={profile.id}
            profile={profile}
            currentUserId={currentUserId}
            initialSaved
            onUnsave={() => handleUnsave(profile.user_id)}
          />
        ))}
      </div>
    </section>
  )
}
