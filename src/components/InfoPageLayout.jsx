import SiteFooter from './SiteFooter'
import SiteTopNav from './SiteTopNav'
import './InfoPage.css'

export default function InfoPageLayout({ session, children, wide = false }) {
  return (
    <div className="info-page">
      <SiteTopNav session={session} />
      <main className={`info-page-main${wide ? ' info-page-wide' : ''}`}>{children}</main>
      <SiteFooter />
    </div>
  )
}
