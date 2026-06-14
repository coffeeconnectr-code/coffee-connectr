import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminReviewVerification, fetchAdminVerificationRequests } from '../../lib/adminApi'

export default function AdminVerification() {
  const [status, setStatus] = useState('pending')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState({})

  async function loadRequests() {
    setLoading(true)
    setError('')

    try {
      setRequests(await fetchAdminVerificationRequests(status))
    } catch (loadError) {
      setError(loadError.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [status])

  async function handleReview(requestId, approved) {
    setError('')

    try {
      await adminReviewVerification(requestId, approved, reasons[requestId] ?? '')
      await loadRequests()
    } catch (reviewError) {
      setError(reviewError.message)
    }
  }

  return (
    <div className="admin-panel">
      <h3>Verification queue</h3>

      <div className="admin-tab-row">
        {['pending', 'approved', 'rejected', ''].map((item) => (
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

      {loading ? <p className="status-message">Loading requests...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && requests.length === 0 ? (
        <p className="status-message">No verification requests in this view.</p>
      ) : null}

      <div className="admin-table">
        {requests.map((request) => (
          <article key={request.id} className="admin-row admin-row-stack">
            <div>
              <strong>{request.profile_name || 'Unknown member'}</strong>
              <p className="browse-meta">Status: {request.status}</p>
              {request.message ? <p className="browse-bio">{request.message}</p> : null}
              {request.admin_reason ? (
                <p className="browse-meta">Admin reason: {request.admin_reason}</p>
              ) : null}
            </div>

            <Link
              to={`/profile/${request.user_id}`}
              className="secondary-button profile-action-link"
            >
              View profile
            </Link>

            {request.status === 'pending' ? (
              <div className="admin-report-actions">
                <input
                  type="text"
                  value={reasons[request.id] ?? ''}
                  onChange={(event) =>
                    setReasons((current) => ({ ...current, [request.id]: event.target.value }))
                  }
                  placeholder="Reason (optional for approve, shown on reject)"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleReview(request.id, true)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary-button profile-danger-button"
                  onClick={() => handleReview(request.id, false)}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
