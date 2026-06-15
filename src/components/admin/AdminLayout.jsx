import { Link, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', exact: true },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/welcome-emails', label: 'Welcome emails' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/verification', label: 'Verification' },
  { to: '/admin/audit', label: 'Audit log' },
]

export default function AdminLayout() {
  const location = useLocation()

  return (
    <section className="card admin-console">
      <div className="admin-header">
        <div>
          <h2>Admin console</h2>
          <p className="status-message">Internal tools for Coffee Connectr.</p>
        </div>
        <Link to="/discover" className="secondary-button profile-action-link">
          Back to app
        </Link>
        <Link to="/dashboard" className="secondary-button profile-action-link">
          Dashboard
        </Link>
      </div>

      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-nav-link${active ? ' admin-nav-link-active' : ''}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </section>
  )
}
