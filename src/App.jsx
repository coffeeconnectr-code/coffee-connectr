import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import DiscoverBrowse from './components/DiscoverBrowse'
import DiscoverMap from './components/DiscoverMap'
import DiscoverRoasters from './components/DiscoverRoasters'
import MessageThread from './components/MessageThread'
import MessagesInbox from './components/MessagesInbox'
import SavedProfiles from './components/SavedProfiles'
import ProfileForm from './components/ProfileForm'
import ProfileView from './components/ProfileView'
import './App.css'

function ProfileViewRoute({ session }) {
  const { userId } = useParams()

  return (
    <ProfileView
      userId={userId}
      currentUserId={session?.user?.id ?? null}
    />
  )
}

function MessagesRoute({ session }) {
  if (!session) {
    return <Navigate to="/" replace />
  }

  return <MessagesInbox currentUserId={session.user.id} />
}

function MessageThreadRoute({ session }) {
  const { userId } = useParams()

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <MessageThread currentUserId={session.user.id} otherUserId={userId} />
}

function SavedProfilesRoute({ session }) {
  if (!session) {
    return <Navigate to="/" replace />
  }

  return <SavedProfiles currentUserId={session.user.id} />
}

function EditProfileRoute({ session }) {
  if (!session) {
    return <Navigate to="/" replace />
  }

  return (
    <ProfileForm
      userId={session.user.id}
      userEmail={session.user.email ?? 'your account'}
    />
  )
}

function HomePage({ session }) {
  if (!session) {
    return (
      <>
        <Auth />
        <section className="card home-card">
          <h2>Explore the community</h2>
          <p className="status-message">
            Browse coffee professionals and businesses, or search by roaster equipment.
          </p>
          <div className="home-actions">
            <Link to="/discover" className="primary-button profile-action-link">
              Discover members
            </Link>
            <Link to="/discover/roasters" className="secondary-button profile-action-link">
              Find roasters
            </Link>
          </div>
        </section>
      </>
    )
  }

  return (
    <section className="card home-card">
      <h2>Welcome back</h2>
      <p className="status-message">Signed in as {session.user.email}</p>
      <div className="home-actions">
        <Link to={`/profile/${session.user.id}`} className="primary-button profile-action-link">
          View my profile
        </Link>
        <Link to="/profile/edit" className="secondary-button profile-action-link">
          Edit profile
        </Link>
        <Link to="/discover" className="secondary-button profile-action-link">
          Discover members
        </Link>
        <Link to="/discover/roasters" className="secondary-button profile-action-link">
          Find roasters
        </Link>
        <Link to="/messages" className="secondary-button profile-action-link">
          Messages
        </Link>
        <Link to="/saved" className="secondary-button profile-action-link">
          Saved
        </Link>
      </div>
    </section>
  )
}

function AppLayout({ session, onSignOut }) {
  return (
    <main className="page">
      <header className="page-header">
        <Link to="/" className="brand-link">
          <h1>Coffee Connectr</h1>
        </Link>
        <div className="header-actions">
          <Link to="/discover" className="secondary-button profile-action-link">
            Discover
          </Link>
          {session ? (
            <>
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
          ) : null}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage session={session} />} />
        <Route path="/discover" element={<DiscoverBrowse currentUserId={session?.user?.id ?? null} />} />
        <Route path="/discover/map" element={<DiscoverMap />} />
        <Route path="/discover/roasters" element={<DiscoverRoasters />} />
        <Route path="/saved" element={<SavedProfilesRoute session={session} />} />
        <Route path="/messages" element={<MessagesRoute session={session} />} />
        <Route path="/messages/:userId" element={<MessageThreadRoute session={session} />} />
        <Route path="/profile/edit" element={<EditProfileRoute session={session} />} />
        <Route path="/profile/:userId" element={<ProfileViewRoute session={session} />} />
      </Routes>
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

  return <AppLayout session={session} onSignOut={handleSignOut} />
}
