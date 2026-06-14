import { Link } from 'react-router-dom'
import Auth from './Auth'
import './LandingPage.css'

export default function SignUpPage() {
  return (
    <div className="sign-up-page">
      <header className="sign-up-header">
        <Link to="/" className="landing-wordmark">
          Coffee Connectr
        </Link>
        <Link to="/discover/map" className="landing-topnav-link">
          Explore map
        </Link>
      </header>

      <Auth />
      <p className="status-message">
        Already have an account? Sign in above, or{' '}
        <Link to="/">return to the homepage</Link>.
      </p>
    </div>
  )
}
