import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../lib/profileApi'
import {
  fetchConversation,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
} from '../lib/messagesApi'
import ReportButton from './ReportButton'
import VerifiedBadge from './VerifiedBadge'

function formatMessageStamp(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MessageThread({ currentUserId, otherUserId }) {
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true

    async function loadThread() {
      setLoading(true)
      setError('')

      try {
        const [profileData, conversation] = await Promise.all([
          fetchProfile(otherUserId),
          fetchConversation(currentUserId, otherUserId),
        ])

        if (!active) {
          return
        }

        setProfile(profileData)
        setMessages(conversation)
        await markConversationRead({ currentUserId, otherUserId })
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadThread()

    return () => {
      active = false
    }
  }, [currentUserId, otherUserId])

  useEffect(() => {
    return subscribeToConversation({
      currentUserId,
      otherUserId,
      onMessage: (message) => {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current
          }

          return [...current, message]
        })

        if (message.recipient_id === currentUserId) {
          markConversationRead({ currentUserId, otherUserId })
        }
      },
    })
  }, [currentUserId, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!draft.trim() || sending) {
      return
    }

    setSending(true)
    setError('')

    try {
      const message = await sendMessage({
        senderId: currentUserId,
        recipientId: otherUserId,
        body: draft,
      })

      setMessages((current) => [...current, message])
      setDraft('')
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const name = profile?.name ?? 'Member'

  return (
    <section className="card messages-card">
      <div className="messages-thread-header">
        <Link to="/messages" className="secondary-button profile-action-link">
          Back to inbox
        </Link>

        <div className="messages-thread-title">
          {profile?.profile_photo_url ? (
            <img src={profile.profile_photo_url} alt="" className="messages-avatar" />
          ) : (
            <div className="messages-avatar messages-avatar-fallback">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2>
              {name}
              {profile?.is_verified ? <VerifiedBadge compact /> : null}
            </h2>
            {profile?.location ? <p className="status-message">{profile.location}</p> : null}
          </div>
        </div>

        <Link to={`/profile/${otherUserId}`} className="secondary-button profile-action-link">
          View profile
        </Link>
      </div>

      {loading ? <p className="status-message">Loading conversation...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      <div className="messages-thread-list">
        {!loading && messages.length === 0 ? (
          <p className="status-message messages-thread-empty">
            No messages yet. Say hello to {name}.
          </p>
        ) : null}

        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId

          return (
            <div
              key={message.id}
              className={`message-bubble-row${isMine ? ' message-bubble-row-mine' : ''}`}
            >
              <div className={`message-bubble${isMine ? ' message-bubble-mine' : ''}`}>
                <p>{message.body}</p>
                <div className="message-bubble-footer">
                  <time dateTime={message.created_at}>{formatMessageStamp(message.created_at)}</time>
                  {!isMine ? (
                    <ReportButton
                      currentUserId={currentUserId}
                      targetType="message"
                      targetId={message.id}
                      targetLabel="message"
                      compact
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form className="messages-compose" onSubmit={handleSubmit}>
        <label className="messages-compose-label">
          Message
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Write a message to ${name}...`}
            rows={3}
            disabled={sending}
          />
        </label>
        <button type="submit" className="primary-button" disabled={sending || !draft.trim()}>
          {sending ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </section>
  )
}
