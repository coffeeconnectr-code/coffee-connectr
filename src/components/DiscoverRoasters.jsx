import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROASTER_BRANDS, formatBatchSize, formatCapacity } from '../lib/roasterConstants'
import { searchProfilesByRoaster } from '../lib/roasterApi'
import CategoryLabel from './CategoryLabel'
import DiscoverNavLinks from './DiscoverNavLinks'
import VerifiedBadge from './VerifiedBadge'

export default function DiscoverRoasters() {
  const [roasterBrand, setRoasterBrand] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadResults() {
      setLoading(true)
      setError('')

      try {
        const profiles = await searchProfilesByRoaster(roasterBrand)
        if (active) {
          setResults(profiles)
        }
      } catch (searchError) {
        if (active) {
          setError(searchError.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadResults()

    return () => {
      active = false
    }
  }, [roasterBrand])

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Find roasters</h2>
          <p className="status-message">
            Search members by roaster equipment — useful for contract roasting on a specific
            machine type.
          </p>
        </div>
        <DiscoverNavLinks current="roasters" />
      </div>

      <label>
        Filter by roaster brand
        <select value={roasterBrand} onChange={(event) => setRoasterBrand(event.target.value)}>
          <option value="">All roaster brands</option>
          {ROASTER_BRANDS.filter((brand) => brand !== 'Other').map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>

      {loading ? <p className="status-message">Searching...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error && results.length === 0 ? (
        <p className="status-message">No roasters found yet. Try a different brand filter.</p>
      ) : null}

      <div className="discover-results">
        {results.map((profile) => (
          <article key={profile.id} className="discover-result">
            <div className="discover-result-top">
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="" className="discover-avatar" />
              ) : (
                <div className="discover-avatar discover-avatar-fallback">
                  {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}

              <div>
                <h3>
                  {profile.name}
                  {profile.is_verified ? <VerifiedBadge compact /> : null}
                </h3>
                {profile.location ? <p className="discover-meta">{profile.location}</p> : null}
                {profile.primary_category ? (
                  <span className="tag">
                    <CategoryLabel category={profile.primary_category} />
                  </span>
                ) : null}
              </div>
            </div>

            <div className="discover-machines">
              {profile.machines.map((machine) => (
                <span key={machine.id} className="tag">
                  {machine.roaster_brand} · {formatBatchSize(machine.batch_size_kg)}
                </span>
              ))}
            </div>

            <dl className="discover-capacity">
              {formatCapacity(profile.total_roasting_capacity_kg) ? (
                <div className="profile-detail">
                  <dt>Total capacity</dt>
                  <dd>{formatCapacity(profile.total_roasting_capacity_kg)}</dd>
                </div>
              ) : null}
              {formatCapacity(profile.contract_roasting_capacity_kg) ? (
                <div className="profile-detail">
                  <dt>Contract capacity available</dt>
                  <dd>{formatCapacity(profile.contract_roasting_capacity_kg)}</dd>
                </div>
              ) : null}
            </dl>

            <Link to={`/profile/${profile.user_id}`} className="secondary-button profile-action-link">
              View profile
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
