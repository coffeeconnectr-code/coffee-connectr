import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchInbox } from '../lib/messagesApi'
import CategoryLabel from './CategoryLabel'

function formatMessageTime(value) {
  const date = new Date(value)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function truncatePreview(text, maxLength = 72) {
  if (!text || text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}…`
}

export default function MessagesInbox({ currentUserId }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadInbox() {
      setLoading(true)
      setError('')

      try {
        const results = await fetchInbox(currentUserId)
        if (active) {
          setConversations(results)
        }
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

    loadInbox()

    return () => {
      active = false
    }
  }, [currentUserId])

  return (
    <section className="card messages-card">
      <div className="messages-header">
        <div>
          <h2>Messages</h2>
          <p className="status-message">Your conversations with other Coffee Connectr members.</p>
        </div>
        <Link to="/discover" className="secondary-button profile-action-link">
          Find members
        </Link>
      </div>

      {loading ? <p className="status-message">Loading messages...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error && conversations.length === 0 ? (
        <div className="messages-empty">
          <p className="status-message">No messages yet.</p>
          <p className="status-message">
            Browse members, open a profile, and tap <strong>Send message</strong> to start a
            conversation.
          </p>
          <Link to="/discover" className="primary-button profile-action-link">
            Discover members
          </Link>
        </div>
      ) : null}

      <div className="messages-inbox-list">
        {conversations.map((conversation) => {
          const { profile, lastMessage, unreadCount, partnerId } = conversation
          const name = profile?.name ?? 'Member'
          const isIncoming = lastMessage.recipient_id === currentUserId

          return (
            <Link
              key={partnerId}
              to={`/messages/${partnerId}`}
              className={`messages-inbox-item${unreadCount > 0 ? ' messages-inbox-item-unread' : ''}`}
            >
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="" className="messages-avatar" />
              ) : (
                <div className="messages-avatar messages-avatar-fallback">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="messages-inbox-copy">
                <div className="messages-inbox-top">
                  <h3>{name}</h3>
                  <time dateTime={lastMessage.created_at}>
                    {formatMessageTime(lastMessage.created_at)}
                  </time>
                </div>

                {profile?.primary_category ? (
                  <span className="messages-inbox-category">
                    <CategoryLabel category={profile.primary_category} />
                  </span>
                ) : null}

                <p className="messages-inbox-preview">
                  {isIncoming ? '' : 'You: '}
                  {truncatePreview(lastMessage.body)}
                </p>
              </div>

              {unreadCount > 0 ? <span className="messages-unread-badge">{unreadCount}</span> : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
