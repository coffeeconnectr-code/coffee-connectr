import SiteFooter from './SiteFooter'
import SiteTopNav from './SiteTopNav'
import './InfoPage.css'
import './LandingPage.css'

export default function InfoPageLayout({ session, children, wide = false }) {
  return (
    <div className="info-page">
      <SiteTopNav session={session} centered />
      <main className={`info-page-main${wide ? ' info-page-wide' : ''}`}>{children}</main>
      <SiteFooter />
    </div>
  )
}
