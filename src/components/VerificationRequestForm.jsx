import { useState } from 'react'
import { submitVerificationRequest } from '../lib/verificationApi'

const EMPTY_REFERENCE = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
}

const EMPTY_REFERENCES = [EMPTY_REFERENCE, EMPTY_REFERENCE, EMPTY_REFERENCE]

export default function VerificationRequestForm({ compact = false, id }) {
  const [message, setMessage] = useState('')
  const [references, setReferences] = useState(EMPTY_REFERENCES)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  function updateReference(index, field, value) {
    setReferences((current) =>
      current.map((reference, referenceIndex) =>
        referenceIndex === index ? { ...reference, [field]: value } : reference,
      ),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      await submitVerificationRequest(message, references)
      setStatus(
        'Verification request submitted with 3 industry references. We emailed each reference contact and an admin will review your request soon.',
      )
      setMessage('')
      setReferences(EMPTY_REFERENCES)
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
          ? 'Submit 3 industry references so we can verify your profile. Each reference contact will receive an email notification.'
          : 'Submit 3 industry references with business and contact details. Each reference will be emailed that they were listed for verification on Coffee Connectr.'}
      </p>
      <form className="report-form verification-reference-form" onSubmit={handleSubmit}>
        <label>
          Message (optional)
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={compact ? 2 : 3}
            placeholder="e.g. I am a certified Q grader with 10 years experience"
          />
        </label>

        {references.map((reference, index) => (
          <fieldset key={index} className="form-section verification-reference-group">
            <legend>Industry reference {index + 1}</legend>

            <label>
              Business name
              <input
                type="text"
                value={reference.businessName}
                onChange={(event) => updateReference(index, 'businessName', event.target.value)}
                placeholder="Business name"
                required
                maxLength={160}
              />
            </label>

            <label>
              Main contact name
              <input
                type="text"
                value={reference.contactName}
                onChange={(event) => updateReference(index, 'contactName', event.target.value)}
                placeholder="Contact name"
                required
                maxLength={120}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={reference.email}
                onChange={(event) => updateReference(index, 'email', event.target.value)}
                placeholder="contact@business.com"
                required
                maxLength={254}
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={reference.phone}
                onChange={(event) => updateReference(index, 'phone', event.target.value)}
                placeholder="+1 555 123 4567"
                required
                maxLength={40}
              />
            </label>

            <label>
              Address
              <textarea
                value={reference.address}
                onChange={(event) => updateReference(index, 'address', event.target.value)}
                placeholder="Street, city, country"
                rows={2}
                required
                maxLength={240}
              />
            </label>
          </fieldset>
        ))}

        <button type="submit" className="secondary-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Request verification'}
        </button>
      </form>
      {status ? <p className="status-message">{status}</p> : null}
    </section>
  )
}
