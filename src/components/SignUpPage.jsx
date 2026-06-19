import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Auth from './Auth'
import SiteTopNav from './SiteTopNav'
import SiteFooter from './SiteFooter'
import { storeFreeProfileInviteToken } from '../lib/freeProfileInvite'
import './LandingPage.css'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('free')

  useEffect(() => {
    storeFreeProfileInviteToken(inviteToken)
  }, [inviteToken])

  return (
    <div className="landing-page">
      <SiteTopNav session={null} />

      <div className="sign-up-page">
        {inviteToken ? (
          <p className="status-message sign-up-invite-note">
            You have been invited to create a <strong>free Coffee Connectr profile for life</strong>.
            Sign up with the same email address that received the invite.
          </p>
        ) : null}
        <Auth defaultIsSignUp inviteToken={inviteToken} />
        <p className="status-message sign-up-legal-note">
          By creating an account, you agree to our{' '}
          <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p className="status-message">
          Already have an account? Sign in above, or{' '}
          <Link to="/">return to the homepage</Link>.
        </p>
        {!inviteToken ? (
          <p className="status-message">
            Interested in a free profile for life?{' '}
            <Link to="/contact?topic=free_profile">Contact us</Link>.
          </p>
        ) : null}
      </div>

      <SiteFooter />
    </div>
  )
}
