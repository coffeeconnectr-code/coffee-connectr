import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminGrantLifetimeFreeMembership,
  adminGrantProfileFeatured,
  adminGrantProfileVerified,
  fetchAdminMembersForMembershipGrant,
} from '../../lib/adminApi'

const BENEFIT_CONFIG = {
  lifetime_free: {
    title: 'Grant lifetime free profile',
    description:
      'Search for a signed-up member and grant them a free profile for life without sending an invite email.',
    grantLabel: 'Grant lifetime free',
    grantingLabel: 'Granting...',
    alreadyGrantedLabel: 'Already lifetime free',
    successMessage: (member) => `Granted lifetime free profile to ${member.email}.`,
    alreadyGrantedReason: 'already_lifetime',
    alreadyGrantedError: 'This member already has a lifetime free profile.',
    isGranted: (member) => member.is_lifetime_free,
    canGrant: () => true,
    grant: adminGrantLifetimeFreeMembership,
    confirmMessage: (member) =>
      `Grant ${member.email} a lifetime free Coffee Connectr profile?`,
  },
  featured: {
    title: 'Grant featured profile',
    description:
      'Search for a member and mark their profile as featured without waiting for a request.',
    grantLabel: 'Grant featured',
    grantingLabel: 'Granting...',
    alreadyGrantedLabel: 'Already featured',
    successMessage: (member) => `Granted featured status to ${member.email}.`,
    alreadyGrantedReason: 'already_featured',
    alreadyGrantedError: 'This member is already featured.',
    isGranted: (member) => member.is_featured,
    canGrant: (member) => member.profile_type !== 'unknown',
    grant: adminGrantProfileFeatured,
    confirmMessage: (member) => `Mark ${member.email} as a featured profile?`,
  },
  verified: {
    title: 'Grant verified badge',
    description:
      'Search for a member and grant verified status without waiting for a verification request.',
    grantLabel: 'Grant verified',
    grantingLabel: 'Granting...',
    alreadyGrantedLabel: 'Already verified',
    successMessage: (member) => `Granted verified status to ${member.email}.`,
    alreadyGrantedReason: 'already_verified',
    alreadyGrantedError: 'This member is already verified.',
    isGranted: (member) => member.is_verified,
    canGrant: (member) => member.profile_type !== 'unknown',
    grant: adminGrantProfileVerified,
    confirmMessage: (member) => `Grant verified status to ${member.email}?`,
  },
}

function memberStatusLine(member) {
  const parts = []

  if (member.is_lifetime_free) {
    parts.push('Lifetime free')
  }

  if (member.is_verified) {
    parts.push('Verified')
  }

  if (member.is_featured) {
    parts.push('Featured')
  }

  if (parts.length === 0) {
    return 'No lifetime / verified / featured status'
  }

  return parts.join(' · ')
}

export default function AdminMemberBenefitGrant({ benefitType }) {
  const config = BENEFIT_CONFIG[benefitType]
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [grantingUserId, setGrantingUserId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadMembers(searchTerm = search, { keepFeedback = false } = {}) {
    setLoading(true)

    if (!keepFeedback) {
      setError('')
      setActionError('')
      setSuccessMessage('')
    }

    try {
      setMembers(await fetchAdminMembersForMembershipGrant(searchTerm))
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
        void loadMembers('')
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleGrant(member) {
    if (!config.canGrant(member)) {
      setActionError('This member needs a saved profile before you can grant this status.')
      return
    }

    const confirmed = window.confirm(config.confirmMessage(member))

    if (!confirmed) {
      return
    }

    setGrantingUserId(member.user_id)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await config.grant(member.user_id)

      if (result?.reason === config.alreadyGrantedReason) {
        setActionError(config.alreadyGrantedError)
        return
      }

      await loadMembers(search, { keepFeedback: true })
      setSuccessMessage(config.successMessage(member))
    } catch (grantError) {
      setActionError(grantError.message)
    } finally {
      setGrantingUserId('')
    }
  }

  return (
    <section className="admin-benefit-grant">
      <h4 className="admin-subheading">{config.title}</h4>
      <p className="status-message">{config.description}</p>

      <div className="admin-search-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email or profile name"
        />
        <button type="button" className="secondary-button" onClick={() => loadMembers(search)}>
          Search
        </button>
      </div>

      {loading ? <p className="status-message">Loading members...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}
      {actionError ? <p className="status-message profile-error">{actionError}</p> : null}
      {successMessage ? <p className="status-message">{successMessage}</p> : null}

      <div className="admin-table">
        {members.map((member) => {
          const granted = config.isGranted(member)
          const canGrant = config.canGrant(member)
          const disabled = grantingUserId === member.user_id || granted || !canGrant

          return (
            <article key={member.user_id} className="admin-row">
              <div>
                <strong>{member.profile_name}</strong>
                <p className="browse-meta">{member.email}</p>
                <p className="browse-meta">
                  {member.profile_type === 'unknown' ? 'No profile saved yet' : member.profile_type}
                  {' · '}
                  Joined {new Date(member.user_created_at).toLocaleDateString()}
                </p>
                <p className="browse-meta">{memberStatusLine(member)}</p>
              </div>
              <div className="admin-row-actions">
                <Link
                  to={`/profile/${member.user_id}`}
                  className="secondary-button profile-action-link"
                >
                  View profile
                </Link>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={disabled}
                  onClick={() => handleGrant(member)}
                >
                  {grantingUserId === member.user_id
                    ? config.grantingLabel
                    : granted
                      ? config.alreadyGrantedLabel
                      : !canGrant
                        ? 'Profile required'
                        : config.grantLabel}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {!loading && members.length === 0 ? (
        <p className="status-message">No members match that search.</p>
      ) : null}
    </section>
  )
}
