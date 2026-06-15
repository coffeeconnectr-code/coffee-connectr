import { useState } from 'react'
import { submitFeaturedRequest } from '../lib/adminApi'

export default function FeaturedRequestForm({ compact = false, id }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      await submitFeaturedRequest(message)
      setStatus('Featured request submitted. An admin will review it soon.')
      setMessage('')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id={id}
      className={`featured-request${compact ? ' featured-request-compact' : ''}`}
    >
      <h3>Request featured profile</h3>
      <p className="field-hint">
        {compact
          ? 'Featured profiles appear at the top of Discover and show a gold star on the map.'
          : 'Tell us why your profile should be featured. Featured members appear at the top of Discover and show a gold star on the map.'}
      </p>
      <form className="report-form" onSubmit={handleSubmit}>
        <label>
          Message (optional)
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder="e.g. Award-winning roastery with 15 years serving the community"
          />
        </label>
        <button type="submit" className="secondary-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Request featured'}
        </button>
      </form>
      {status ? <p className="status-message">{status}</p> : null}
    </section>
  )
}
