import { Link } from 'react-router-dom'
import { HOW_TO_USE_STEPS, PROFILE_TIPS } from '../lib/infoPageConstants'
import InfoPageLayout from './InfoPageLayout'

export default function HowToUsePage({ session }) {
  const profileCta = session ? '/profile/edit' : '/sign-up'

  return (
    <InfoPageLayout session={session}>
      <section className="info-hero">
        <p className="info-eyebrow">How to use Coffee Connectr</p>
        <h1>Get started in a few minutes</h1>
        <p className="info-hero-lead">
          New here? Here&apos;s everything you need to get the most out of Coffee Connectr. It
          only takes a few minutes to get set up.
        </p>
        <p className="info-crosslink">
          Want the bigger picture first? Read <Link to="/about">What is Coffee Connectr?</Link>
        </p>
      </section>

      <section className="info-section">
        <div className="info-step-list">
          {HOW_TO_USE_STEPS.map((step) => (
            <article key={step.number} className="info-step-card">
              <p className="info-step-number">Step {step.number}</p>
              <h3>{step.title}</h3>
              <p>{step.intro}</p>
              {step.bullets ? (
                <ul>
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>Tips for a great profile</h2>
        <ul className="info-tips-list">
          {PROFILE_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="info-section">
        <h2>Need a hand?</h2>
        <p className="info-contact">
          Got a question or run into a problem? <Link to="/contact">Contact us</Link> — we&apos;re
          happy to help.
        </p>
        <div className="info-actions">
          <Link to={profileCta} className="primary-button profile-action-link">
            Create your profile
          </Link>
          <Link to="/discover/map" className="secondary-button profile-action-link">
            Explore the map
          </Link>
        </div>
      </section>
    </InfoPageLayout>
  )
}
