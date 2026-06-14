import SiteFooter from './SiteFooter'
import SiteTopNav from './SiteTopNav'
import './InfoPage.css'

export default function InfoPageLayout({ session, children }) {
  return (
    <div className="info-page">
      <SiteTopNav session={session} />
      <main className="info-page-main">{children}</main>
      <SiteFooter />
    </div>
  )
}
