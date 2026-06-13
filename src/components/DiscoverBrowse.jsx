import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { browseProfiles } from '../lib/browseApi'
import { CATEGORIES } from '../lib/profileConstants'
import ProfileBrowseCard from './ProfileBrowseCard'

export default function DiscoverBrowse() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [profileType, setProfileType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadResults() {
      setLoading(true)
      setError('')

      try {
        const profiles = await browseProfiles({ search, category, profileType })
        if (active) {
          setResults(profiles)
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

    const timeout = window.setTimeout(loadResults, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [search, category, profileType])

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Discover members</h2>
          <p className="status-message">
            Browse coffee professionals and businesses across the community.
          </p>
        </div>
        <Link to="/discover/roasters" className="secondary-button profile-action-link">
          Find roasters
        </Link>
      </div>

      <div className="browse-filters">
        <label>
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, location, or bio"
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Profile type
          <select value={profileType} onChange={(event) => setProfileType(event.target.value)}>
            <option value="">All types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </label>
      </div>

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
          <ProfileBrowseCard key={profile.id} profile={profile} />
        ))}
      </div>
    </section>
  )
}
