import { Link } from 'react-router-dom'
import { CATEGORIES, getCategoryIcon } from '../lib/profileConstants'
import {
  LANDING_CONTACT_EMAIL,
  LANDING_SOCIAL_LINKS,
  LANDING_STEPS,
} from '../lib/landingConstants'
import './LandingPage.css'

export default function LandingPage({ session }) {
  const profileCta = session ? '/profile/edit' : '/sign-up'

  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <Link to="/" className="landing-wordmark">
          Coffee Connectr
        </Link>
        <nav className="landing-topnav" aria-label="Main">
          <Link to="/discover/map" className="landing-topnav-link">
            Explore map
          </Link>
          {session ? (
            <Link to={`/profile/${session.user.id}`} className="landing-topnav-link">
              My profile
            </Link>
          ) : (
            <Link to="/sign-up" className="landing-topnav-link">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Coffee Connectr</p>
          <h1>The global network for the coffee industry.</h1>
          <p className="landing-hero-subline">
            Find roasters, technicians, trainers, suppliers, importers and more — wherever you are
            in the world.
          </p>
          <div className="landing-hero-actions">
            <Link to="/discover/map" className="primary-button profile-action-link">
              Explore the map
            </Link>
            <Link to={profileCta} className="secondary-button profile-action-link">
              Create your profile
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section landing-steps" aria-labelledby="how-it-works-title">
        <div className="landing-section-inner">
          <h2 id="how-it-works-title" className="landing-section-title">
            How it works
          </h2>
          <div className="landing-steps-grid">
            {LANDING_STEPS.map((step) => (
              <article key={step.number} className="landing-step-card">
                <p className="landing-step-number">{step.number}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-categories" aria-labelledby="categories-title">
        <div className="landing-section-inner">
          <h2 id="categories-title" className="landing-section-title">
            Explore the community
          </h2>
          <p className="landing-section-lead">
            Thirteen ways to connect across the coffee supply chain — from origin to recruitment.
          </p>
          <div className="landing-category-grid">
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                to={`/discover?category=${encodeURIComponent(category)}`}
                className="landing-category-card"
              >
                <span className="landing-category-icon" aria-hidden="true">
                  {getCategoryIcon(category)}
                </span>
                <span className="landing-category-label">{category}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="landing-footer-mission">
            Let&apos;s build a more profitable and sustainable coffee industry together.
          </p>
          <div className="landing-footer-links">
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
    </div>
  )
}
