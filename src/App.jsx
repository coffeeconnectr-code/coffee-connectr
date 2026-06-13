import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ProfileForm from './components/ProfileForm'
import './App.css'

function App() {
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
    <main className="page">
      <header className="page-header">
        <h1>Coffee Connectr</h1>
        {session ? (
          <button type="button" className="secondary-button" onClick={handleSignOut}>
            Sign out
          </button>
        ) : null}
      </header>

      {!session ? (
        <Auth />
      ) : (
        <ProfileForm
          userId={session.user.id}
          userEmail={session.user.email ?? 'your account'}
        />
      )}
    </main>
  )
}

export default App
