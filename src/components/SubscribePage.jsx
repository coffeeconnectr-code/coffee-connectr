import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getPlanPriceLabel } from '../lib/memberAccess'
import { PRICING_PLANS } from '../lib/pricingConstants'
import useMemberAccess from '../hooks/useMemberAccess'

export default function SubscribePage({ session }) {
  const { access, hasAccess, loading } = useMemberAccess(session)
  const profileCta = '/profile/edit'
  const individualPlan = PRICING_PLANS.find((plan) => plan.id === 'individual')
  const businessPlan = PRICING_PLANS.find((plan) => plan.id === 'business')
  const planType = access?.planType ?? 'individual'

  if (loading) {
    return (
      <section className="card subscribe-page">
        <p className="status-message">Checking membership...</p>
      </section>
    )
  }

  if (hasAccess) {
    return <Navigate to="/dashboard" replace />
  }

  const membershipUnavailable = access.status === 'unknown' || access.status === 'anonymous'

  return (
    <section className="card subscribe-page">
      <p className="info-eyebrow">Membership required</p>
      <h2>{membershipUnavailable ? 'We could not verify your membership' : 'Your free trial has ended'}</h2>
      <p className="status-message">
        {membershipUnavailable
          ? 'Your account does not have an active trial yet. Sign out and back in after your site admin runs the subscription setup in Supabase. If this keeps happening, contact us.'
          : 'To keep your profile visible on the map and continue messaging, saving profiles, and posting on the noticeboard, choose a monthly plan.'}
      </p>

      <div className="subscribe-plan-summary">
        <article className="subscribe-plan-card">
          <h3>Individual</h3>
          <p className="subscribe-plan-price">{individualPlan?.price} / month</p>
          <p>{individualPlan?.description}</p>
        </article>
        <article className="subscribe-plan-card">
          <h3>Business</h3>
          <p className="subscribe-plan-price">{businessPlan?.price} / month</p>
          <p>{businessPlan?.description}</p>
        </article>
      </div>

      <p className="status-message">
        Your profile type is currently set to{' '}
        <strong>{planType === 'business' ? 'Business' : 'Individual'}</strong>, so your plan
        would be <strong>{getPlanPriceLabel(planType)}</strong> after billing is enabled.
      </p>

      <div className="info-actions">
        <Link to="/pricing" className="primary-button profile-action-link">
          View pricing
        </Link>
        <Link to={profileCta} className="secondary-button profile-action-link">
          Update profile type
        </Link>
      </div>

      <p className="subscribe-billing-note">
        Online card billing is coming soon. Until then,{' '}
        <Link to="/contact?topic=billing">contact us</Link> to subscribe and we will activate your
        account manually.
      </p>
    </section>
  )
}
