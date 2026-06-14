import { Link } from 'react-router-dom'

export default function SiteTopNav({ session }) {
  return (
    <header className="landing-topbar">
      <Link to="/" className="landing-wordmark">
        Coffee Connectr
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
