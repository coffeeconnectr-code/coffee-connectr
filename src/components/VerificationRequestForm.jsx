import { useState } from 'react'
import { submitVerificationRequest } from '../lib/adminApi'

export default function VerificationRequestForm({ compact = false, id }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      await submitVerificationRequest(message)
      setStatus('Verification request submitted. An admin will review it soon.')
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
      className={`verification-request${compact ? ' verification-request-compact' : ''}`}
    >
      <h3>Request verification badge</h3>
      <p className="field-hint">
        {compact
          ? 'Build trust with a verified badge. Tell us why your profile should be verified.'
          : 'Tell us why your profile should be verified. An admin will review your request.'}
      </p>
      <form className="report-form" onSubmit={handleSubmit}>
        <label>
          Message (optional)
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder="e.g. I am a certified Q grader with 10 years experience"
          />
        </label>
        <button type="submit" className="secondary-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Request verification'}
        </button>
      </form>
      {status ? <p className="status-message">{status}</p> : null}
    </section>
  )
}
