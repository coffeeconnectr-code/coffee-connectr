import { useEffect, useState } from 'react'
import {
  adminSendWelcomeEmail,
  fetchAdminWelcomeEmailMembers,
} from '../../lib/adminApi'

function welcomeStatusLabel(status) {
  if (status === 'sent') {
    return 'Sent'
  }

  if (status === 'skipped_legacy') {
    return 'Skipped (legacy)'
  }

  return 'Not sent'
}

export default function AdminWelcomeEmails() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [sendingUserId, setSendingUserId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadMembers() {
    setLoading(true)
    setError('')
    setActionError('')
    setSuccessMessage('')

    try {
      setMembers(await fetchAdminWelcomeEmailMembers(search))
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
        void loadMembers()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleSend(member) {
    const actionLabel = member.welcome_status === 'sent' ? 'Resend' : 'Send'
    const confirmed = window.confirm(
      `${actionLabel} welcome email to ${member.email}?`,
    )

    if (!confirmed) {
      return
    }

    setSendingUserId(member.user_id)
    setActionError('')
    setSuccessMessage('')

    try {
      await adminSendWelcomeEmail(member.user_id)
      setSuccessMessage(`Welcome email sent to ${member.email}.`)
      await loadMembers()
    } catch (sendError) {
      setActionError(sendError.message)
    } finally {
      setSendingUserId('')
    }
  }

  return (
    <div className="admin-panel">
      <h3>Welcome emails</h3>
      <p className="status-message">
        Send the How to Use welcome email to members who signed up before it was working,
        or resend it if needed.
      </p>

      <div className="admin-search-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email or profile name"
        />
        <button type="button" className="secondary-button" onClick={loadMembers}>
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
                Joined {new Date(member.user_created_at).toLocaleDateString()}
                {' · '}
                Welcome: {welcomeStatusLabel(member.welcome_status)}
                {member.welcome_sent_at
                  ? ` (${new Date(member.welcome_sent_at).toLocaleDateString()})`
                  : ''}
              </p>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={sendingUserId === member.user_id}
                onClick={() => handleSend(member)}
              >
                {sendingUserId === member.user_id
                  ? 'Sending...'
                  : member.welcome_status === 'sent'
                    ? 'Resend welcome email'
                    : 'Send welcome email'}
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
