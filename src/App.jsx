import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
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
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Coffee Connectr — coming soon</h1>

      {session ? (
        <section className="signed-in">
          <p>Signed in as {session.user.email}</p>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      ) : (
        <Auth />
      )}
    </main>
  )
}

export default App
