import { useEffect, useState } from 'react'
import {
  fetchMyFeedback,
  submitMemberFeedback,
  uploadFeedbackScreenshot,
} from '../lib/feedbackApi'

function formatFeedbackDate(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function FeedbackForm({ userId, userEmail }) {
  const [message, setMessage] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setLoadingHistory(true)

      try {
        const items = await fetchMyFeedback()
        if (active) {
          setHistory(items)
        }
      } catch {
        if (active) {
          setHistory([])
        }
      } finally {
        if (active) {
          setLoadingHistory(false)
        }
      }
    }

    const timeout = window.setTimeout(() => {
      if (active) {
        void loadHistory()
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [])

  function handleScreenshotChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview)
    }

    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
    setStatus('')
  }

  function clearScreenshot() {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview)
    }

    setScreenshotFile(null)
    setScreenshotPreview('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setStatus('')

    try {
      let screenshotUrl = null

      if (screenshotFile) {
        screenshotUrl = await uploadFeedbackScreenshot(screenshotFile, userId)
      }

      await submitMemberFeedback({
        message,
        screenshotUrl,
      })

      setMessage('')
      clearScreenshot()
      setStatus('Thanks — your feedback was sent to the Coffee Connectr team.')
      setHistory(await fetchMyFeedback())
    } catch (submitError) {
      setStatus(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-feedback">
      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <h3>Send feedback</h3>
            <p className="status-message">
              Report a bug, suggest an improvement, or share what&apos;s working well. Feedback
              goes directly to the admin team.
            </p>
          </div>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          <label>
            Your message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Describe what happened, what you expected, or what we could improve..."
              required
              minLength={10}
              maxLength={4000}
            />
          </label>

          <div className="feedback-screenshot-field">
            <p className="field-label">Screenshot (optional)</p>
            <p className="field-hint">Attach an image to help us see the issue. Max 5 MB.</p>

            {screenshotPreview ? (
              <div className="feedback-screenshot-preview">
                <div className="noticeboard-photo-thumb">
                  <img src={screenshotPreview} alt="Screenshot preview" />
                </div>
                <button type="button" className="text-button" onClick={clearScreenshot}>
                  Remove screenshot
                </button>
              </div>
            ) : (
              <label className="secondary-button profile-action-link feedback-upload-button">
                Add screenshot
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  disabled={submitting}
                />
              </label>
            )}
          </div>

          <p className="field-hint">Sending as {userEmail}</p>

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send feedback'}
          </button>
        </form>

        {status ? <p className="status-message">{status}</p> : null}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <h3>Your recent feedback</h3>
        </div>

        {loadingHistory ? <p className="status-message">Loading feedback history...</p> : null}

        {!loadingHistory && history.length === 0 ? (
          <p className="status-message">You have not sent any feedback yet.</p>
        ) : null}

        {!loadingHistory && history.length > 0 ? (
          <div className="feedback-history-list">
            {history.map((item) => (
              <article key={item.id} className="feedback-history-item">
                <div className="feedback-history-meta">
                  <span className={`tag${item.status === 'open' ? '' : ' tag-primary'}`}>
                    {item.status === 'open' ? 'Open' : 'Resolved'}
                  </span>
                  <time dateTime={item.created_at}>{formatFeedbackDate(item.created_at)}</time>
                </div>
                <p className="browse-bio">{item.message}</p>
                {item.screenshot_url ? (
                  <a
                    href={item.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-button profile-action-link"
                  >
                    View screenshot
                  </a>
                ) : null}
                {item.admin_notes ? (
                  <p className="browse-meta">Admin response: {item.admin_notes}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
