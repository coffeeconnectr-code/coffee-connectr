import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getAuthRedirectUrl } from '../lib/authRedirect'
import { notifyWelcomeEmail } from '../lib/notificationsApi'

export default function Auth({ defaultIsSignUp = false }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(defaultIsSignUp)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  async function handleEmailAuth(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setResendMessage('')
    setPendingConfirmationEmail('')

    const { data, error } = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl('/dashboard'),
          },
        })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(
        isSignUp && error.message.toLowerCase().includes('already registered')
          ? 'An account with this email already exists. Switch to Sign in below.'
          : error.message,
      )
    } else if (data.session) {
      if (isSignUp) {
        notifyWelcomeEmail(data.session.user.id, data.session.access_token)
      }
      navigate(isSignUp ? '/profile/edit' : '/dashboard', { replace: true })
    } else if (isSignUp) {
      setPendingConfirmationEmail(email.trim())
      setMessage(
        `We sent a confirmation link to ${email.trim()}. Click it to activate your account, then sign in here. Check spam if you do not see it within a few minutes.`,
      )
    }

    setLoading(false)
  }

  async function handleResendConfirmation() {
    if (!pendingConfirmationEmail) {
      return
    }

    setLoading(true)
    setResendMessage('')

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingConfirmationEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/dashboard'),
      },
    })

    if (error) {
      setResendMessage(error.message)
    } else {
      setResendMessage(`Another confirmation email was sent to ${pendingConfirmationEmail}.`)
    }

    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setMessage('')
    setResendMessage('')
    setPendingConfirmationEmail('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/dashboard'),
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
        {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
      </button>

      <button
        type="button"
        className="text-button"
        onClick={() => {
          setIsSignUp((current) => !current)
          setMessage('')
          setResendMessage('')
          setPendingConfirmationEmail('')
        }}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>

      {message ? <p className="auth-message">{message}</p> : null}

      {pendingConfirmationEmail ? (
        <div className="auth-confirmation-panel">
          <p className="status-message">
            No confirmation email? Ask your site admin to connect Resend SMTP in Supabase, or
            try resending below.
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={handleResendConfirmation}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Resend confirmation email'}
          </button>
          {resendMessage ? <p className="auth-message">{resendMessage}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
