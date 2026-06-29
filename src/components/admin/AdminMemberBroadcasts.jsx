import { useEffect, useState } from 'react'
import {
  adminCreateMemberBroadcast,
  adminSendMemberBroadcast,
  fetchAdminMemberBroadcastCount,
  fetchAdminMemberBroadcasts,
} from '../../lib/adminApi'

function broadcastStatusLabel(status) {
  if (status === 'sent') {
    return 'Sent'
  }

  if (status === 'partial') {
    return 'Partially sent'
  }

  if (status === 'failed') {
    return 'Failed'
  }

  return 'Sending'
}

export default function AdminMemberBroadcasts() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [excludeSuspended, setExcludeSuspended] = useState(true)
  const [recipientCount, setRecipientCount] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [countLoading, setCountLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadRecipientCount() {
    setCountLoading(true)

    try {
      setRecipientCount(await fetchAdminMemberBroadcastCount(excludeSuspended))
    } catch (countError) {
      setError(countError.message)
      setRecipientCount(null)
    } finally {
      setCountLoading(false)
    }
  }

  async function loadHistory() {
    setLoading(true)
    setError('')

    try {
      setHistory(await fetchAdminMemberBroadcasts())
    } catch (loadError) {
      setError(loadError.message)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  useEffect(() => {
    void loadRecipientCount()
  }, [excludeSuspended])

  async function handleSend(event) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setProgress('')

    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedSubject || !trimmedMessage) {
      setError('Subject and message are required.')
      return
    }

    if (recipientCount === 0) {
      setError('No members match the selected recipient filters.')
      return
    }

    const confirmed = window.confirm(
      `Send this update email to ${recipientCount ?? 'all matching'} members? This cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setSending(true)

    try {
      const { broadcastId } = await adminCreateMemberBroadcast({
        subject: trimmedSubject,
        message: trimmedMessage,
        excludeSuspended,
      })

      const result = await adminSendMemberBroadcast(broadcastId, ({ processedCount, totalRecipients: total }) => {
        setProgress(`Sending... ${processedCount} of ${total} processed`)
      })

      await loadHistory()
      await loadRecipientCount()
      setSubject('')
      setMessage('')
      setSuccessMessage(
        `Broadcast sent to ${result.sentCount} member${result.sentCount === 1 ? '' : 's'}` +
          (result.failedCount > 0 ? ` (${result.failedCount} failed).` : '.'),
      )
      setProgress('')
    } catch (sendError) {
      setError(sendError.message)
      await loadHistory()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-panel">
      <h3>Member updates</h3>
      <p className="status-message">
        Send an email with information and updates to all members who have signed up.
        Messages are sent as plain text with a standard Coffee Connectr footer.
      </p>

      <form className="profile-form admin-broadcast-form" onSubmit={handleSend}>
        <label>
          Subject
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. New features and platform updates"
            maxLength={200}
            required
            disabled={sending}
          />
        </label>

        <label>
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your update for members here..."
            rows={10}
            maxLength={12000}
            required
            disabled={sending}
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={excludeSuspended}
            onChange={(event) => setExcludeSuspended(event.target.checked)}
            disabled={sending}
          />
          Exclude suspended members
        </label>

        <p className="field-hint">
          {countLoading
            ? 'Counting recipients...'
            : recipientCount === null
              ? 'Recipient count unavailable.'
              : `${recipientCount} member${recipientCount === 1 ? '' : 's'} will receive this email.`}
        </p>

        <button type="submit" className="secondary-button" disabled={sending || countLoading}>
          {sending ? 'Sending broadcast...' : 'Send update to all members'}
        </button>
      </form>

      {progress ? <p className="status-message">{progress}</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}
      {successMessage ? <p className="status-message">{successMessage}</p> : null}

      <h4 className="admin-subheading">Recent broadcasts</h4>

      {loading ? <p className="status-message">Loading broadcast history...</p> : null}

      <div className="admin-table">
        {history.map((broadcast) => (
          <article key={broadcast.id} className="admin-row admin-row-stack">
            <div>
              <strong>{broadcast.subject}</strong>
              <p className="browse-meta">
                {broadcastStatusLabel(broadcast.status)}
                {' · '}
                {broadcast.sent_count}/{broadcast.recipient_count} sent
                {broadcast.failed_count > 0 ? ` · ${broadcast.failed_count} failed` : ''}
                {' · '}
                {new Date(broadcast.created_at).toLocaleString()}
              </p>
              <p className="browse-meta">Sent by {broadcast.created_by_name}</p>
              <p className="browse-bio">{broadcast.message}</p>
              {broadcast.last_error ? (
                <p className="browse-meta profile-error">Last error: {broadcast.last_error}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!loading && history.length === 0 ? (
        <p className="status-message">No member broadcasts have been sent yet.</p>
      ) : null}
    </div>
  )
}
