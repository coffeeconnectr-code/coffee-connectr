import { useState } from 'react'
import { submitContentReport } from '../lib/adminApi'

const REPORT_REASONS = [
  'Spam or scam',
  'Harassment',
  'Misleading content',
  'Inappropriate content',
  'Other',
]

export default function ReportButton({
  currentUserId,
  targetType,
  targetId,
  targetLabel = 'content',
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!currentUserId) {
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await submitContentReport({
        targetType,
        targetId,
        reason,
        details,
      })
      setMessage('Report submitted. Thank you.')
      setDetails('')
      setOpen(false)
    } catch (submitError) {
      setMessage(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-block">
      <button type="button" className="secondary-button" onClick={() => setOpen((value) => !value)}>
        Report {targetLabel}
      </button>

      {open ? (
        <form className="report-form" onSubmit={handleSubmit}>
          <label>
            Reason
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {REPORT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Details (optional)
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Anything else we should know?"
            />
          </label>
          <button type="submit" className="secondary-button" disabled={loading}>
            {loading ? 'Sending...' : 'Submit report'}
          </button>
        </form>
      ) : null}

      {message ? <p className="status-message">{message}</p> : null}
    </div>
  )
}
