import { useEffect, useState } from 'react'
import { fetchAdminAuditLog } from '../../lib/adminApi'

function formatAuditTime(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminAudit() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadAuditLog() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAdminAuditLog()
        if (active) {
          setEntries(data)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
          setEntries([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadAuditLog()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="admin-panel">
      <h3>Audit log</h3>
      <p className="field-hint">Every admin action is recorded here.</p>

      {loading ? <p className="status-message">Loading audit log...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && entries.length === 0 ? (
        <p className="status-message">No admin actions logged yet.</p>
      ) : null}

      <div className="admin-table">
        {entries.map((entry) => (
          <article key={entry.id} className="admin-row admin-row-stack">
            <div>
              <strong>{entry.action}</strong>
              <p className="browse-meta">
                {formatAuditTime(entry.created_at)}
                {entry.target_type ? ` · ${entry.target_type}` : ''}
                {entry.target_id ? ` · ${entry.target_id}` : ''}
              </p>
              {entry.details && Object.keys(entry.details).length > 0 ? (
                <p className="browse-bio">{JSON.stringify(entry.details)}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
