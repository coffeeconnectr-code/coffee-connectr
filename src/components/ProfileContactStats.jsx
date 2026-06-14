import { useEffect, useState } from 'react'
import { fetchProfileContactStats } from '../lib/contactApi'

function formatCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function ProfileContactStats({ profileUserId, profileName, isOwnProfile }) {
  const [stats, setStats] = useState({ contactedCount: 0, contactedByCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadStats() {
      setLoading(true)

      try {
        const result = await fetchProfileContactStats(profileUserId)
        if (active) {
          setStats(result)
        }
      } catch {
        if (active) {
          setStats({ contactedCount: 0, contactedByCount: 0 })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [profileUserId])

  const contactedLabel = isOwnProfile
    ? 'Members you have contacted'
    : `Members ${profileName} has contacted`

  const contactedByLabel = isOwnProfile
    ? 'Members who have contacted you'
    : `Members who have contacted ${profileName}`

  return (
    <section className="profile-contact-stats" aria-label="Contact activity">
      <article className="profile-contact-stat">
        <p className="profile-contact-stat-value">
          {loading ? '—' : stats.contactedCount}
        </p>
        <p className="profile-contact-stat-label">{contactedLabel}</p>
        {!loading ? (
          <p className="profile-contact-stat-meta">
            {formatCountLabel(stats.contactedCount, 'unique member', 'unique members')}
          </p>
        ) : null}
      </article>

      <article className="profile-contact-stat">
        <p className="profile-contact-stat-value">
          {loading ? '—' : stats.contactedByCount}
        </p>
        <p className="profile-contact-stat-label">{contactedByLabel}</p>
        {!loading ? (
          <p className="profile-contact-stat-meta">
            {formatCountLabel(stats.contactedByCount, 'unique member', 'unique members')}
          </p>
        ) : null}
      </article>
    </section>
  )
}
