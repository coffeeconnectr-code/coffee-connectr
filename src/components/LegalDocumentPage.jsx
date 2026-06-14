import { Link } from 'react-router-dom'
import { LANDING_CONTACT_EMAIL } from '../lib/landingConstants'
import InfoPageLayout from './InfoPageLayout'

function LegalSection({ section }) {
  return (
    <section className="info-section legal-section">
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.bullets ? (
        <ul className="legal-bullet-list">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default function LegalDocumentPage({
  session,
  eyebrow,
  title,
  lead,
  lastUpdated,
  sections,
  relatedLink,
}) {
  return (
    <InfoPageLayout session={session}>
      <section className="info-hero">
        <p className="info-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="info-hero-lead">{lead}</p>
        <p className="legal-updated">Last updated: {lastUpdated}</p>
        {relatedLink ? (
          <p className="info-crosslink">
            See also: <Link to={relatedLink.to}>{relatedLink.label}</Link>
          </p>
        ) : null}
      </section>

      {sections.map((section) => (
        <LegalSection key={section.title} section={section} />
      ))}

      <section className="info-section">
        <h2>Questions</h2>
        <p className="info-contact">
          Contact us at{' '}
          <a href={`mailto:${LANDING_CONTACT_EMAIL}`}>{LANDING_CONTACT_EMAIL}</a>
        </p>
        <p className="legal-disclaimer">
          This document is provided for general information. Consider independent legal advice
          for your specific situation.
        </p>
      </section>
    </InfoPageLayout>
  )
}
