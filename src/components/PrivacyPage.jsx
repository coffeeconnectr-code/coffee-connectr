import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS } from '../lib/legalConstants'
import LegalDocumentPage from './LegalDocumentPage'

export default function PrivacyPage({ session }) {
  return (
    <LegalDocumentPage
      session={session}
      eyebrow="Legal"
      title="Privacy Policy"
      lead="How Coffee Connectr collects, uses, and protects your personal information."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={PRIVACY_SECTIONS}
      relatedLink={{ to: '/terms', label: 'Terms of Service' }}
    />
  )
}
