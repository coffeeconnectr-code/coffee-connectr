import { useEffect, useState } from 'react'
import {
  adminGrantOneYearFreeMembership,
  fetchAdminMembersForMembershipGrant,
} from '../../lib/adminApi'

function membershipSummary(member) {
  if (member.is_lifetime_free) {
    return 'Lifetime free profile'
  }

  if (member.subscription_status === 'trialing' && member.trial_ends_at) {
    return `Trial until ${new Date(member.trial_ends_at).toLocaleDateString()}`
  }

  if (member.subscription_status === 'active' && member.current_period_end) {
    return `Active until ${new Date(member.current_period_end).toLocaleDateString()}`
  }

  if (member.subscription_status === 'active') {
    return 'Active membership'
  }

  return member.subscription_status === 'none' ? 'No subscription row' : member.subscription_status
}

export default function AdminFreeYearMembership() {
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
    const confirmed = window.confirm(
      `Grant ${member.email} 1 year of free membership? This extends any existing trial or paid period by 12 months.`,
    )

    if (!confirmed) {
      return
    }

    setGrantingUserId(member.user_id)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await adminGrantOneYearFreeMembership(
        member.user_id,
        member.profile_type === 'business' ? 'business' : 'individual',
      )

      if (result?.reason === 'already_lifetime') {
        setActionError('This member already has a lifetime free profile.')
        return
      }

      await loadMembers(search, { keepFeedback: true })
      const endDate = result.currentPeriodEnd
        ? new Date(result.currentPeriodEnd).toLocaleDateString()
        : '1 year from now'
      setSuccessMessage(`Granted 1 year free membership to ${member.email} (active until ${endDate}).`)
    } catch (grantError) {
      setActionError(grantError.message)
    } finally {
      setGrantingUserId('')
    }
  }

  return (
    <div className="admin-panel">
      <h3>1 year free membership</h3>
      <p className="status-message">
        Search for a member and grant 12 months of free active membership. If they already have
        trial or paid time remaining, the year is added on top.
      </p>

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

      {loading ? <p className="status-message">Loading...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}
      {actionError ? <p className="status-message profile-error">{actionError}</p> : null}
      {successMessage ? <p className="status-message">{successMessage}</p> : null}

      <div className="admin-table">
        {members.map((member) => (
          <article key={member.user_id} className="admin-row">
            <div>
              <strong>{member.profile_name}</strong>
              <p className="browse-meta">{member.email}</p>
              <p className="browse-meta">
                {member.profile_type === 'unknown' ? 'No profile saved yet' : member.profile_type}
                {' · '}
                Joined {new Date(member.user_created_at).toLocaleDateString()}
              </p>
              <p className="browse-meta">Access: {membershipSummary(member)}</p>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={grantingUserId === member.user_id || member.is_lifetime_free}
                onClick={() => handleGrant(member)}
              >
                {grantingUserId === member.user_id
                  ? 'Granting...'
                  : member.is_lifetime_free
                    ? 'Already lifetime'
                    : 'Grant 1 year free'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && members.length === 0 ? (
        <p className="status-message">No members match that search.</p>
      ) : null}
    </div>
  )
}
