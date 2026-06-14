import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from '../lib/legalConstants'
import LegalDocumentPage from './LegalDocumentPage'

export default function TermsPage({ session }) {
  return (
    <LegalDocumentPage
      session={session}
      eyebrow="Legal"
      title="Terms of Service"
      lead="The rules for using Coffee Connectr, our coffee industry networking platform."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={TERMS_SECTIONS}
      relatedLink={{ to: '/privacy', label: 'Privacy Policy' }}
    />
  )
}
