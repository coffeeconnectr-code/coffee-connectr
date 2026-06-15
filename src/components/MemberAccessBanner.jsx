import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccessSummary } from '../lib/memberAccess'

export default function MemberAccessBanner({ access, loading }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (loading || access?.status !== 'trialing' || !access?.trialEndsAt) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loading, access?.status, access?.trialEndsAt])

  if (loading || !access) {
    return null
  }

  const summary = getAccessSummary(access, now)

  if (!summary) {
    return null
  }

  if (!access.hasAccess) {
    return (
      <section className="member-access-banner member-access-banner-warning">
        <div>
          <strong>Membership inactive</strong>
          <p>Subscribe to restore messaging, noticeboard posting, and map visibility.</p>
        </div>
        <Link to="/subscribe" className="secondary-button profile-action-link">
          Subscribe
        </Link>
      </section>
    )
  }

  if (access.status === 'trialing') {
    return (
      <section className="member-access-banner member-access-banner-trial">
        <div>
          <strong>{summary}</strong>
          <p>
            After your trial, your {access.planType === 'business' ? 'Business' : 'Individual'}{' '}
            plan will be billed monthly until you cancel.
          </p>
        </div>
        <Link to="/pricing" className="secondary-button profile-action-link">
          View pricing
        </Link>
      </section>
    )
  }

  return null
}
