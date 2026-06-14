import { Navigate } from 'react-router-dom'
import useMemberAccess from '../hooks/useMemberAccess'

export default function MemberGate({ session, children }) {
  const { hasAccess, loading } = useMemberAccess(session)

  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  if (loading) {
    return (
      <section className="card">
        <p className="status-message">Checking membership...</p>
      </section>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/subscribe" replace />
  }

  return children
}
