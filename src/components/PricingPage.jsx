import { Link } from 'react-router-dom'
import { PRICING_FAQ, PRICING_LAUNCH_NOTE, PRICING_PLANS, PRICING_TRIAL_NOTE } from '../lib/pricingConstants'
import InfoPageLayout from './InfoPageLayout'

function planCta(plan, profileCta) {
  return {
    label: plan.id === 'trial' ? 'Start free trial' : 'Choose plan',
    to: profileCta,
    className: plan.highlighted ? 'primary-button profile-action-link' : 'secondary-button profile-action-link',
  }
}

export default function PricingPage({ session }) {
  const profileCta = session ? '/profile/edit' : '/sign-up'

  return (
    <InfoPageLayout session={session} wide>
      <section className="info-hero">
        <p className="info-eyebrow">Plans & pricing</p>
        <h1>Join the coffee industry network</h1>
        <p className="info-hero-lead">{PRICING_LAUNCH_NOTE}</p>
        <p className="pricing-trial-note">{PRICING_TRIAL_NOTE}</p>
        <p className="info-crosslink">
          New here? Read <Link to="/about">What is Coffee Connectr?</Link> or the{' '}
          <Link to="/how-to-use">How to use</Link> guide.
        </p>
      </section>

      <section className="info-section">
        <div className="pricing-plan-grid">
          {PRICING_PLANS.map((plan) => {
            const cta = planCta(plan, profileCta)

            return (
              <article
                key={plan.id}
                className={`pricing-plan-card${plan.highlighted ? ' pricing-plan-highlighted' : ''}`}
              >
                {plan.highlighted ? (
                  <p className="pricing-plan-badge">90 days free</p>
                ) : null}

                <p className="pricing-plan-audience">{plan.audience}</p>
                <h2>{plan.name}</h2>
                <p className="pricing-plan-price">
                  {plan.price}
                  <span> / {plan.period}</span>
                </p>
                <p className="pricing-plan-description">{plan.description}</p>

                <ul className="pricing-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <Link to={cta.to} className={cta.className}>
                  {cta.label}
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="info-section">
        <h2>Compare at a glance</h2>
        <div className="pricing-compare-table-wrap">
          <table className="pricing-compare-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Free trial</th>
                <th scope="col">Individual</th>
                <th scope="col">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Profile on the map</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Discover &amp; search</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Messaging</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Noticeboard</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Business profile fields</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Roaster equipment</th>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Priority support</th>
                <td>—</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Verified badge application</th>
                <td>—</td>
                <td>—</td>
                <td>✓</td>
              </tr>
              <tr>
                <th scope="row">Featured profile application</th>
                <td>—</td>
                <td>—</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section">
        <h2>Common questions</h2>
        <div className="pricing-faq-list">
          {PRICING_FAQ.map((item) => (
            <article key={item.question} className="pricing-faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>Ready to join?</h2>
        <p>
          Start with 90 days free. Put yourself on the map and connect with roasters,
          technicians, suppliers and more across the coffee world.
        </p>
        <div className="info-actions">
          <Link to={profileCta} className="primary-button profile-action-link">
            Start free trial
          </Link>
          <Link to="/discover/map" className="secondary-button profile-action-link">
            Explore the map
          </Link>
        </div>
        <p className="info-contact info-contact-spaced">
          Questions about plans? <Link to="/contact">Contact us</Link>
        </p>
      </section>
    </InfoPageLayout>
  )
}
