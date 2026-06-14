import { Link } from 'react-router-dom'
import Auth from './Auth'
import SiteTopNav from './SiteTopNav'
import SiteFooter from './SiteFooter'
import './LandingPage.css'

export default function SignUpPage() {
  return (
    <div className="landing-page">
      <SiteTopNav session={null} />

      <div className="sign-up-page">
        <Auth />
        <p className="status-message">
          Already have an account? Sign in above, or{' '}
          <Link to="/">return to the homepage</Link>.
        </p>
      </div>

      <SiteFooter />
    </div>
  )
}
