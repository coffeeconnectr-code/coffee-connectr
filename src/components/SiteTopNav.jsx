import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'

export default function SiteTopNav({ session, centered = false }) {
  return (
    <header className={`landing-topbar${centered ? ' landing-topbar-centered' : ''}`}>
      <Link to="/" className="landing-wordmark">
        <BrandMark titleClassName="landing-wordmark-title" />
      </Link>
      <nav className="landing-topnav" aria-label="Main">
        <Link to="/discover/map" className="landing-topnav-link">
          Explore map
        </Link>
        <Link to="/about" className="landing-topnav-link">
          About
        </Link>
        <Link to="/how-to-use" className="landing-topnav-link">
          How to use
        </Link>
        <Link to="/pricing" className="landing-topnav-link">
          Pricing
        </Link>
        <Link to="/contact" className="landing-topnav-link">
          Contact
        </Link>
        {session ? (
          <Link to="/dashboard" className="landing-topnav-link">
            Dashboard
          </Link>
        ) : (
          <Link to="/sign-up" className="landing-topnav-link">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
