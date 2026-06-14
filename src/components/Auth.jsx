import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { notifyWelcomeEmail } from '../lib/notificationsApi'

export default function Auth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
    } else if (data.session) {
      if (isSignUp) {
        notifyWelcomeEmail(data.session.user.id)
      }
      navigate(isSignUp ? '/profile/edit' : '/dashboard', { replace: true })
    } else if (isSignUp) {
      setMessage('Check your email to confirm your account (if confirmation is enabled).')
    }

    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <section className="auth">
      <h2>{isSignUp ? 'Create an account' : 'Sign in'}</h2>

      <form className="auth-form" onSubmit={handleEmailAuth}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isSignUp ? 'Sign up with email' : 'Sign in with email'}
        </button>
      </form>

      <button
        type="button"
        className="google-button"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        Sign in with Google
      </button>

      <button
        type="button"
        className="text-button"
        onClick={() => {
          setIsSignUp((current) => !current)
          setMessage('')
        }}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}
