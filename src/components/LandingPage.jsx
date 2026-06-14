import { Link } from 'react-router-dom'
import { CATEGORIES, getCategoryIcon } from '../lib/profileConstants'
import { LANDING_STEPS } from '../lib/landingConstants'
import SiteFooter from './SiteFooter'
import SiteTopNav from './SiteTopNav'
import './LandingPage.css'

export default function LandingPage({ session }) {
  const profileCta = session ? '/profile/edit' : '/sign-up'

  return (
    <div className="landing-page">
      <SiteTopNav session={session} />

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
          <p className="landing-section-lead landing-section-follow">
            <Link to="/how-to-use" className="landing-footer-link">
              Read the full how-to guide
            </Link>
          </p>
        </div>
      </section>

      <section className="landing-section landing-categories" aria-labelledby="categories-title">
        <div className="landing-section-inner">
          <h2 id="categories-title" className="landing-section-title">
            Explore the community
          </h2>
          <p className="landing-section-lead">
            Thirteen ways to connect across the coffee supply chain — from origin to recruitment.{' '}
            <Link to="/about" className="landing-footer-link">
              Learn more about Coffee Connectr
            </Link>
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

      <SiteFooter />
    </div>
  )
}
