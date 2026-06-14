import { Link } from 'react-router-dom'
import { ABOUT_CATEGORIES, ABOUT_FEATURES } from '../lib/infoPageConstants'
import InfoPageLayout from './InfoPageLayout'

export default function AboutPage({ session }) {
  const profileCta = session ? '/profile/edit' : '/sign-up'

  return (
    <InfoPageLayout session={session}>
      <section className="info-hero">
        <p className="info-eyebrow">What is Coffee Connectr?</p>
        <h1>The global network for the coffee industry.</h1>
        <p className="info-hero-lead">
          Coffee Connectr is an interactive world map that connects the people and businesses who
          make coffee happen — wherever they are.
        </p>
      </section>

      <section className="info-section">
        <p>
          Coffee is a long journey, from seed to cup, and it takes a lot of hands. Producers,
          importers, roasters, technicians, trainers, café owners, equipment suppliers, designers,
          logistics specialists — a whole industry of people who constantly need to find each
          other, and who are often surprisingly hard to track down.
        </p>
        <p>
          <strong>Coffee Connectr puts everyone on one map.</strong>
        </p>
        <p>
          Create a profile, place yourself on the map, and list what you do. Anyone looking for
          your skills, your services or your products can find you by searching the map for
          exactly what they need — and reach out directly.
        </p>
        <p className="info-crosslink">
          New here? Read our <Link to="/how-to-use">How to use</Link> guide.
        </p>
      </section>

      <section className="info-section">
        <h2>Who it&apos;s for</h2>
        <p>
          Whether you&apos;re an individual or a business, if you work in coffee, there&apos;s a
          place for you here. The network spans the whole industry:
        </p>
        <div className="info-category-list">
          {ABOUT_CATEGORIES.map((item) => (
            <Link
              key={item.category}
              to={`/discover?category=${encodeURIComponent(item.category)}`}
              className="info-category-item"
            >
              <strong>{item.label}</strong>
              <span> — {item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>What you can do</h2>
        <div className="info-feature-grid">
          {ABOUT_FEATURES.map((feature) => (
            <article key={feature.title} className="info-feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>The mission</h2>
        <div className="info-mission">
          <p>
            Coffee Connectr exists to make the coffee world smaller and better connected. When the
            people who keep this industry running can find each other easily, everyone benefits.
          </p>
          <p>
            Let&apos;s build a more profitable and sustainable coffee industry together.
          </p>
        </div>
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
