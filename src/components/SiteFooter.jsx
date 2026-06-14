import { Link } from 'react-router-dom'
import { LANDING_CONTACT_EMAIL, LANDING_SOCIAL_LINKS } from '../lib/landingConstants'

export default function SiteFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <p className="landing-footer-mission">
          Let&apos;s build a more profitable and sustainable coffee industry together.
        </p>
        <div className="landing-footer-links">
          <Link to="/about" className="landing-footer-link">
            About
          </Link>
          <Link to="/how-to-use" className="landing-footer-link">
            How to use
          </Link>
          <a href={`mailto:${LANDING_CONTACT_EMAIL}`} className="landing-footer-link">
            {LANDING_CONTACT_EMAIL}
          </a>
          <a
            href={LANDING_SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noreferrer"
            className="landing-footer-link"
          >
            Instagram
          </a>
          <a
            href={LANDING_SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noreferrer"
            className="landing-footer-link"
          >
            Facebook
          </a>
        </div>
        <p className="landing-footer-note">Coffee Connectr</p>
      </div>
    </footer>
  )
}
