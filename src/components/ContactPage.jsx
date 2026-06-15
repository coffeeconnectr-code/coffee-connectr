import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CONTACT_TOPICS } from '../lib/contactConstants'
import { submitContactForm } from '../lib/contactFormApi'
import InfoPageLayout from './InfoPageLayout'

const EMPTY_FORM = {
  name: '',
  email: '',
  topic: 'general',
  message: '',
  website: '',
}

export default function ContactPage({ session }) {
  const [searchParams] = useSearchParams()
  const topicParam = searchParams.get('topic')
  const validTopic = CONTACT_TOPICS.some((item) => item.value === topicParam)
  const topicFromUrl = validTopic ? topicParam : null
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const topic = topicFromUrl ?? form.topic
  const email = form.email || session?.user?.email || ''

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await submitContactForm({
        ...form,
        email,
        topic,
      })

      if (result?.skipped) {
        setMessage('Contact delivery is not configured yet. Please try again later.')
        return
      }

      setSubmitted(true)
      setForm({
        ...EMPTY_FORM,
        email: session?.user?.email ?? '',
        topic: form.topic,
      })
    } catch (submitError) {
      setMessage(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <InfoPageLayout session={session}>
      <section className="info-hero">
        <p className="info-eyebrow">Contact</p>
        <h1>Contact us</h1>
        <p className="info-hero-lead">
          Questions about your account, billing, or using Coffee Connectr? Send us a message and
          we&apos;ll get back to you.
        </p>
      </section>

      <section className="info-section">
        {submitted ? (
          <div className="contact-success-card">
            <h2>Message sent</h2>
            <p className="status-message">
              Thanks for getting in touch. We&apos;ll reply to the email address you provided as
              soon as we can.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSubmitted(false)
                setMessage('')
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form className="contact-form auth-form" onSubmit={handleSubmit}>
            <label>
              Your name
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Your name"
                required
                maxLength={120}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>

            <label>
              Topic
              <select
                value={topic}
                onChange={(event) => updateField('topic', event.target.value)}
                required
              >
                {CONTACT_TOPICS.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Message
              <textarea
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder="How can we help?"
                rows={6}
                required
                minLength={10}
                maxLength={4000}
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

            <button type="submit" className="primary-button profile-action-link" disabled={loading}>
              {loading ? 'Sending...' : 'Send message'}
            </button>

            {message ? <p className="auth-message">{message}</p> : null}
          </form>
        )}
      </section>
    </InfoPageLayout>
  )
}
