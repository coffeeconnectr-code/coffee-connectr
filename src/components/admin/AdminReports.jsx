import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminResolveReport, fetchAdminReports } from '../../lib/adminApi'

function reportTargetLink(report) {
  if (report.target_type === 'profile') {
    return `/profile/${report.target_id}`
  }

  if (report.target_type === 'listing') {
    return `/noticeboard/${report.target_id}`
  }

  return null
}

export default function AdminReports() {
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState({})

  async function loadReports() {
    setLoading(true)
    setError('')

    try {
      setReports(await fetchAdminReports(status))
    } catch (loadError) {
      setError(loadError.message)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) {
        void loadReports()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [status])

  async function handleResolve(reportId, nextStatus) {
    setError('')

    try {
      await adminResolveReport(reportId, nextStatus, notes[reportId] ?? '')
      await loadReports()
    } catch (resolveError) {
      setError(resolveError.message)
    }
  }

  const targetLink = (report) => reportTargetLink(report)

  return (
    <div className="admin-panel">
      <h3>Reports queue</h3>

      <div className="admin-tab-row">
        {['open', 'resolved', 'dismissed', ''].map((item) => (
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

      {loading ? <p className="status-message">Loading reports...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && reports.length === 0 ? (
        <p className="status-message">No reports in this view.</p>
      ) : null}

      <div className="admin-table">
        {reports.map((report) => (
          <article key={report.id} className="admin-row admin-row-stack">
            <div>
              <strong>
                {report.target_type} report · {report.status}
              </strong>
              {report.target_summary ? (
                <p className="browse-meta">Target: {report.target_summary}</p>
              ) : null}
              <p className="browse-meta">Reason: {report.reason}</p>
              {report.details ? <p className="browse-bio">{report.details}</p> : null}
              {report.admin_notes ? (
                <p className="browse-meta">Admin notes: {report.admin_notes}</p>
              ) : null}
            </div>

            {targetLink(report) ? (
              <Link to={targetLink(report)} className="secondary-button profile-action-link">
                View target
              </Link>
            ) : report.target_type === 'message' ? (
              <p className="browse-meta">Reported message id: {report.target_id}</p>
            ) : null}

            {report.status === 'open' ? (
              <div className="admin-report-actions">
                <input
                  type="text"
                  value={notes[report.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [report.id]: event.target.value }))
                  }
                  placeholder="Admin notes (optional)"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleResolve(report.id, 'resolved')}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleResolve(report.id, 'dismissed')}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
