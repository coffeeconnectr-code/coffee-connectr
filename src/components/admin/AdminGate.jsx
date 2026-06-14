import { Navigate } from 'react-router-dom'
import useAdminAccess from '../../hooks/useAdminAccess'

export default function AdminGate({ session, children }) {
  const { isAdmin, loading } = useAdminAccess(session)

  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  if (loading) {
    return (
      <main className="page">
        <p className="status-message">Checking access...</p>
      </main>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/discover" replace />
  }

  return children
}
