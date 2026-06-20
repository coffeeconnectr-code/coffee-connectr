import { useEffect, useState } from 'react'
import { fetchRecommendationStats, submitBusinessRecommendation } from '../lib/recommendationsApi'
import DiscoverNavLinks from './DiscoverNavLinks'
import LocationPicker from './LocationPicker'
import RecommendationStatsPanel from './RecommendationStatsPanel'

const EMPTY_FORM = {
  contactName: '',
  businessName: '',
  businessType: '',
  location: '',
  latitude: null,
  longitude: null,
  email: '',
  phone: '',
  website: '',
}

export default function DiscoverRecommend({ session }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let active = true

    async function loadStats() {
      try {
        const nextStats = await fetchRecommendationStats()
        if (active) {
          setStats(nextStats)
        }
      } catch {
        if (active) {
          setStats(null)
        }
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [submitted])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleLocationChange(nextLocation) {
    setForm((current) => ({
      ...current,
      location: nextLocation.location ?? '',
      latitude: nextLocation.latitude ?? null,
      longitude: nextLocation.longitude ?? null,
    }))
  }

  function resetRecommendForm() {
    setSubmitted(false)
    setMessage('')
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await submitBusinessRecommendation({
        contactName: form.contactName.trim(),
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim(),
        location: form.location.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website,
      })

      if (result?.skipped) {
        setMessage('Recommendation emails are not configured yet. Please try again later.')
        return
      }

      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch (submitError) {
      setMessage(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card discover-card">
      <div className="discover-header">
        <div>
          <h2>Recommend Someone</h2>
          <p className="status-message">
            Know a coffee business that should be on Coffee Connectr? Send them a recommendation
            email with a link to join for a free month. Every 5 recommendations that sign up earns
            you an extra free month.
          </p>
        </div>
        <DiscoverNavLinks
          current="recommend"
          onRepeatCurrent={(key) => {
            if (key === 'recommend') {
              resetRecommendForm()
            }
          }}
        />
      </div>

      {stats ? <RecommendationStatsPanel stats={stats} compact /> : null}

      {submitted ? (
        <div className="contact-success-card">
          <h3>Recommendation sent</h3>
          <p className="status-message">
            We emailed them to let them know they were recommended on Coffee Connectr, with a link
            to sign up for a free month.
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={resetRecommendForm}
          >
            Recommend another business
          </button>
        </div>
      ) : (
        <form className="profile-form recommend-form" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Business details</legend>
            <p className="field-hint">
              Name, business name, and email are required so we can send the recommendation.
            </p>

            <label>
              Name
              <input
                type="text"
                value={form.contactName}
                onChange={(event) => updateField('contactName', event.target.value)}
                placeholder="Contact name"
                required
                maxLength={120}
              />
            </label>

            <label>
              Business name
              <input
                type="text"
                value={form.businessName}
                onChange={(event) => updateField('businessName', event.target.value)}
                placeholder="Business name"
                required
                maxLength={160}
              />
            </label>

            <label>
              Business type
              <input
                type="text"
                value={form.businessType}
                onChange={(event) => updateField('businessType', event.target.value)}
                placeholder="e.g. Roastery, Café, Importer"
                maxLength={120}
              />
            </label>

            <LocationPicker
              location={form.location}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={handleLocationChange}
            />

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="business@example.com"
                required
                maxLength={254}
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+1 555 123 4567"
                maxLength={40}
              />
            </label>

            <label className="contact-honeypot" aria-hidden="true">
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </label>
          </fieldset>

          <button type="submit" className="primary-button profile-action-link" disabled={loading}>
            {loading ? 'Sending...' : 'Send recommendation'}
          </button>

          {message ? <p className="auth-message">{message}</p> : null}
          {session?.user?.email ? (
            <p className="field-hint">Sending as {session.user.email}</p>
          ) : null}
        </form>
      )}
    </section>
  )
}
