import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import DiscoverBrowse from './components/DiscoverBrowse'
import DiscoverMap from './components/DiscoverMap'
import DiscoverRoasters from './components/DiscoverRoasters'
import LandingPage from './components/LandingPage'
import MessageThread from './components/MessageThread'
import MessagesInbox from './components/MessagesInbox'
import NoticeboardBrowse from './components/NoticeboardBrowse'
import NoticeboardForm from './components/NoticeboardForm'
import NoticeboardMap from './components/NoticeboardMap'
import NoticeboardPostView from './components/NoticeboardPostView'
import SavedProfiles from './components/SavedProfiles'
import SignUpPage from './components/SignUpPage'
import ProfileForm from './components/ProfileForm'
import ProfileView from './components/ProfileView'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminGate from './components/admin/AdminGate'
import AdminLayout from './components/admin/AdminLayout'
import AdminModeration from './components/admin/AdminModeration'
import AdminReports from './components/admin/AdminReports'
import AdminVerification from './components/admin/AdminVerification'
import useAdminAccess from './hooks/useAdminAccess'
import { isUuid } from './lib/uuid'
import './App.css'

function ProfileViewRoute({ session }) {
  const { userId } = useParams()

  if (!isUuid(userId)) {
    return <Navigate to="/discover" replace />
  }

  return (
    <ProfileView
      userId={userId}
      currentUserId={session?.user?.id ?? null}
    />
  )
}

function MessagesRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return <MessagesInbox currentUserId={session.user.id} />
}

function MessageThreadRoute({ session }) {
  const { userId } = useParams()

  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  if (!isUuid(userId)) {
    return <Navigate to="/messages" replace />
  }

  return <MessageThread currentUserId={session.user.id} otherUserId={userId} />
}

function SavedProfilesRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return <SavedProfiles currentUserId={session.user.id} />
}

function EditProfileRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return (
    <ProfileForm
      userId={session.user.id}
      userEmail={session.user.email ?? 'your account'}
    />
  )
}

function NoticeboardNewRoute({ session }) {
  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  return <NoticeboardForm userId={session.user.id} />
}

function NoticeboardPostRoute({ session }) {
  const { postId } = useParams()

  if (postId === 'map') {
    return <Navigate to="/noticeboard/map" replace />
  }

  if (postId === 'new') {
    return <Navigate to="/noticeboard/new" replace />
  }

  if (!isUuid(postId)) {
    return <Navigate to="/noticeboard" replace />
  }

  return (
    <NoticeboardPostView
      postId={postId}
      currentUserId={session?.user?.id ?? null}
    />
  )
}

function NoticeboardEditRoute({ session }) {
  const { postId } = useParams()

  if (!session) {
    return <Navigate to="/sign-up" replace />
  }

  if (!isUuid(postId)) {
    return <Navigate to="/noticeboard" replace />
  }

  return <NoticeboardForm userId={session.user.id} postId={postId} />
}

function AdminRoute({ session }) {
  return (
    <AdminGate session={session}>
      <AdminLayout />
    </AdminGate>
  )
}

function AppShell({ session, onSignOut }) {
  const { isAdmin } = useAdminAccess(session)

  return (
    <main className="page">
      <header className="page-header">
        <Link to="/" className="brand-link">
          <h1>Coffee Connectr</h1>
        </Link>
        <div className="header-actions">
          <Link to="/discover/map" className="secondary-button profile-action-link">
            Map
          </Link>
          <Link to="/discover" className="secondary-button profile-action-link">
            Discover
          </Link>
          <Link to="/noticeboard" className="secondary-button profile-action-link">
            Noticeboard
          </Link>
          {session ? (
            <>
              {isAdmin ? (
                <Link to="/admin" className="secondary-button profile-action-link">
                  Admin
                </Link>
              ) : null}
              <Link to="/messages" className="secondary-button profile-action-link">
                Messages
              </Link>
              <Link to="/saved" className="secondary-button profile-action-link">
                Saved
              </Link>
              <button type="button" className="secondary-button" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/sign-up" className="secondary-button profile-action-link">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <Outlet />
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <main className="page">
        <p className="status-message">Loading...</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage session={session} />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/admin" element={<AdminRoute session={session} />}>
        <Route index element={<AdminDashboard />} />
        <Route path="moderation" element={<AdminModeration />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="verification" element={<AdminVerification />} />
      </Route>
      <Route element={<AppShell session={session} onSignOut={handleSignOut} />}>
        <Route path="/discover" element={<DiscoverBrowse currentUserId={session?.user?.id ?? null} />} />
        <Route path="/discover/map" element={<DiscoverMap />} />
        <Route path="/discover/roasters" element={<DiscoverRoasters />} />
        <Route path="/noticeboard" element={<NoticeboardBrowse currentUserId={session?.user?.id ?? null} />} />
        <Route path="/noticeboard/map" element={<NoticeboardMap />} />
        <Route path="/noticeboard/new" element={<NoticeboardNewRoute session={session} />} />
        <Route path="/noticeboard/:postId/edit" element={<NoticeboardEditRoute session={session} />} />
        <Route path="/noticeboard/:postId" element={<NoticeboardPostRoute session={session} />} />
        <Route path="/saved" element={<SavedProfilesRoute session={session} />} />
        <Route path="/messages" element={<MessagesRoute session={session} />} />
        <Route path="/messages/:userId" element={<MessageThreadRoute session={session} />} />
        <Route path="/profile/edit" element={<EditProfileRoute session={session} />} />
        <Route path="/profile/:userId" element={<ProfileViewRoute session={session} />} />
      </Route>
    </Routes>
  )
}
