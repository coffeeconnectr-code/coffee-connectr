import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboardStats } from '../../lib/adminApi'

function StatCard({ label, value, to }) {
  return (
    <article className="admin-stat-card">
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-label">{label}</p>
      {to ? (
        <Link to={to} className="admin-stat-link">
          Open
        </Link>
      ) : null}
    </article>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadStats() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAdminDashboardStats()
        if (active) {
          setStats(data)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <p className="status-message">Loading dashboard...</p>
  }

  if (error) {
    return <p className="status-message profile-error">{error}</p>
  }

  return (
    <div className="admin-panel">
      <h3>Dashboard</h3>
      <div className="admin-stat-grid">
        <StatCard label="Profiles" value={stats.profiles} />
        <StatCard label="Listings" value={stats.listings} to="/admin/moderation" />
        <StatCard label="Messages" value={stats.messages} />
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Open reports" value={stats.open_reports} to="/admin/reports" />
        <StatCard
          label="Pending verifications"
          value={stats.pending_verifications}
          to="/admin/verification"
        />
        <StatCard
          label="Pending featured"
          value={stats.pending_featured ?? 0}
          to="/admin/featured"
        />
        <StatCard
          label="Open feedback"
          value={stats.open_feedback ?? 0}
          to="/admin/feedback"
        />
      </div>
    </div>
  )
}
