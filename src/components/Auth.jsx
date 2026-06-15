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
  const [showResendPanel, setShowResendPanel] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const canResendConfirmation = Boolean(pendingConfirmationEmail || showResendPanel)

  async function handleEmailAuth(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setResendMessage('')

    if (isSignUp) {
      setPendingConfirmationEmail('')
    }

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
      const lowerError = error.message.toLowerCase()

      if (
        !isSignUp &&
        (lowerError.includes('not confirmed') || lowerError.includes('email not confirmed'))
      ) {
        setShowResendPanel(true)
        setMessage(
          'Please confirm your email before signing in. You can resend the confirmation link below.',
        )
      } else {
        setMessage(
          isSignUp && lowerError.includes('already registered')
            ? 'An account with this email already exists. Switch to Sign in below.'
            : error.message,
        )
      }
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
    const targetEmail = (pendingConfirmationEmail || email).trim()

    if (!targetEmail) {
      setResendMessage('Enter your email address above first.')
      return
    }

    setLoading(true)
    setResendMessage('')

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/dashboard'),
      },
    })

    if (error) {
      setResendMessage(error.message)
    } else {
      setPendingConfirmationEmail(targetEmail)
      setShowResendPanel(true)
      setResendMessage(`Another confirmation email was sent to ${targetEmail}.`)
    }

    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setMessage('')
    setResendMessage('')
    setPendingConfirmationEmail('')
    setShowResendPanel(false)

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
          setShowResendPanel(false)
        }}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>

      {message ? <p className="auth-message">{message}</p> : null}

      {!isSignUp && !canResendConfirmation ? (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setShowResendPanel(true)
            setResendMessage('')
            setMessage('')
          }}
        >
          Resend confirmation email
        </button>
      ) : null}

      {canResendConfirmation ? (
        <div className="auth-confirmation-panel">
          <p className="status-message">
            {pendingConfirmationEmail
              ? 'No confirmation email? Check spam, or resend below.'
              : 'Enter the email you signed up with, then resend your confirmation link.'}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={handleResendConfirmation}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Resend confirmation email'}
          </button>
          {showResendPanel && !pendingConfirmationEmail ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setShowResendPanel(false)
                setResendMessage('')
              }}
            >
              Cancel
            </button>
          ) : null}
          {resendMessage ? <p className="auth-message">{resendMessage}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
