import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminResolveMemberFeedback, fetchAdminMemberFeedback } from '../../lib/adminApi'

function formatFeedbackDate(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminFeedback() {
  const [status, setStatus] = useState('open')
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState({})

  async function loadFeedback() {
    setLoading(true)
    setError('')

    try {
      setFeedback(await fetchAdminMemberFeedback(status))
    } catch (loadError) {
      setError(loadError.message)
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) {
        void loadFeedback()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [status])

  async function handleResolve(feedbackId) {
    setError('')

    try {
      await adminResolveMemberFeedback(feedbackId, notes[feedbackId] ?? '')
      await loadFeedback()
    } catch (resolveError) {
      setError(resolveError.message)
    }
  }

  return (
    <div className="admin-panel">
      <h3>Member feedback</h3>

      <div className="admin-tab-row">
        {['open', 'resolved', ''].map((item) => (
          <button
            key={item || 'all'}
            type="button"
            className={`noticeboard-pill${status === item ? ' noticeboard-pill-active' : ''}`}
            onClick={() => setStatus(item)}
          >
            {item === '' ? 'All' : item}
          </button>
        ))}
      </div>

      {loading ? <p className="status-message">Loading feedback...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && feedback.length === 0 ? (
        <p className="status-message">No feedback in this view.</p>
      ) : null}

      <div className="admin-table">
        {feedback.map((item) => (
          <article key={item.id} className="admin-row admin-row-stack">
            <div>
              <strong>{item.profile_name || 'Unknown member'}</strong>
              <p className="browse-meta">
                {item.user_email || 'No email'} · {formatFeedbackDate(item.created_at)} ·{' '}
                {item.status}
              </p>
              <p className="browse-bio">{item.message}</p>
              {item.screenshot_url ? (
                <a
                  href={item.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button profile-action-link"
                >
                  View screenshot
                </a>
              ) : null}
              {item.admin_notes ? (
                <p className="browse-meta">Admin notes: {item.admin_notes}</p>
              ) : null}
            </div>

            <Link
              to={`/profile/${item.user_id}`}
              className="secondary-button profile-action-link"
            >
              View profile
            </Link>

            {item.status === 'open' ? (
              <div className="admin-report-actions">
                <input
                  type="text"
                  value={notes[item.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                  placeholder="Optional note for your records"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleResolve(item.id)}
                >
                  Mark resolved
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
