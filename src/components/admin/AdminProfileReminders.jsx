import { useEffect, useState } from 'react'
import {
  adminSendProfileReminderEmail,
  fetchAdminIncompleteProfileMembers,
} from '../../lib/adminApi'

export default function AdminProfileReminders() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [sendingUserId, setSendingUserId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadMembers(searchTerm = search, { keepFeedback = false } = {}) {
    setLoading(true)
    if (!keepFeedback) {
      setError('')
      setActionError('')
      setSuccessMessage('')
    }

    try {
      setMembers(await fetchAdminIncompleteProfileMembers(searchTerm))
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

  async function handleSend(member) {
    const actionLabel = member.reminder_count > 0 ? 'Resend' : 'Send'
    const confirmed = window.confirm(
      `${actionLabel} finish-your-profile email to ${member.email}?`,
    )

    if (!confirmed) {
      return
    }

    setSendingUserId(member.user_id)
    setActionError('')
    setSuccessMessage('')

    try {
      const result = await adminSendProfileReminderEmail(member.user_id)
      await loadMembers(search, { keepFeedback: true })
      setSuccessMessage(
        result.warning
          ? `Finish-your-profile email sent to ${member.email}. (${result.warning})`
          : `Finish-your-profile email sent to ${member.email}.`,
      )
    } catch (sendError) {
      setActionError(sendError?.message || 'Reminder email failed. Check Edge Function logs.')
    } finally {
      setSendingUserId('')
    }
  }

  return (
    <div className="admin-panel">
      <h3>Profile reminders</h3>
      <p className="status-message">
        Send a reminder to members whose profiles are incomplete and not visible in Discover.
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
                {member.profile_updated_at
                  ? ` · Updated ${new Date(member.profile_updated_at).toLocaleDateString()}`
                  : ''}
              </p>
              <p className="browse-meta">
                Reminders sent: {member.reminder_count}
                {member.last_reminder_sent_at
                  ? ` (last ${new Date(member.last_reminder_sent_at).toLocaleDateString()})`
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
                  : member.reminder_count > 0
                    ? 'Resend reminder'
                    : 'Send reminder'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && members.length === 0 ? (
        <p className="status-message">No incomplete profiles match that search.</p>
      ) : null}
    </div>
  )
}
