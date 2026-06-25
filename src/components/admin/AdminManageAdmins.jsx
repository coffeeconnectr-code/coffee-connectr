import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  adminSetUserAdmin,
  fetchAdminUsersForAdminAccess,
} from '../../lib/adminApi'

export default function AdminManageAdmins() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadMembers(searchTerm = search, { keepFeedback = false } = {}) {
    setLoading(true)

    if (!keepFeedback) {
      setError('')
      setActionError('')
      setSuccessMessage('')
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setCurrentUserId(session?.user?.id ?? null)
      setMembers(await fetchAdminUsersForAdminAccess(searchTerm))
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

  async function handleToggleAdmin(member) {
    const nextIsAdmin = !member.is_admin
    const actionLabel = nextIsAdmin ? 'Make admin' : 'Remove admin'
    const confirmed = window.confirm(`${actionLabel} for ${member.email}?`)

    if (!confirmed) {
      return
    }

    setUpdatingUserId(member.user_id)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await adminSetUserAdmin(member.user_id, nextIsAdmin)

      if (result?.reason === 'last_admin') {
        setActionError('You cannot remove admin access from the last remaining admin.')
        return
      }

      await loadMembers(search, { keepFeedback: true })
      setSuccessMessage(
        nextIsAdmin
          ? `${member.email} can now access the admin console.`
          : `${member.email} no longer has admin access.`,
      )
    } catch (updateError) {
      setActionError(updateError.message)
    } finally {
      setUpdatingUserId('')
    }
  }

  return (
    <div className="admin-panel">
      <h3>Manage admins</h3>
      <p className="status-message">
        Promote trusted members to admin so they can use the admin console, or remove admin access
        when needed.
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
              <strong>
                {member.profile_name}
                {member.user_id === currentUserId ? ' (you)' : ''}
              </strong>
              <p className="browse-meta">{member.email}</p>
              <p className="browse-meta">
                {member.is_admin ? 'Admin' : 'Member'}
                {' · '}
                Joined {new Date(member.user_created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className={`secondary-button${member.is_admin ? ' profile-danger-button' : ''}`}
                disabled={updatingUserId === member.user_id}
                onClick={() => handleToggleAdmin(member)}
              >
                {updatingUserId === member.user_id
                  ? 'Saving...'
                  : member.is_admin
                    ? 'Remove admin'
                    : 'Make admin'}
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
