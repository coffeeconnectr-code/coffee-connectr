import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSavedProfiles } from '../lib/favouritesApi'
import { fetchInbox } from '../lib/messagesApi'
import { fetchUserNoticeboardPosts, isPostLive } from '../lib/noticeboardApi'
import { fetchProfile } from '../lib/profileApi'
import { getProfileCompletion } from '../lib/profileCompletion'
import CategoryLabel from './CategoryLabel'
import ProfileContactStats from './ProfileContactStats'
import ProfileListings from './ProfileListings'
import VerifiedBadge from './VerifiedBadge'

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

export default function MemberDashboard({ userId, userEmail }) {
  const [profile, setProfile] = useState(null)
  const [conversations, setConversations] = useState([])
  const [savedProfiles, setSavedProfiles] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [profileData, inbox, saved, posts] = await Promise.all([
          fetchProfile(userId, userId),
          fetchInbox(userId),
          fetchSavedProfiles(userId),
          fetchUserNoticeboardPosts(userId, { includeAll: true }),
        ])

        if (active) {
          setProfile(profileData)
          setConversations(inbox)
          setSavedProfiles(saved)
          setListings(posts)
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

    loadDashboard()

    return () => {
      active = false
    }
  }, [userId])

  if (loading) {
    return <p className="status-message">Loading your dashboard...</p>
  }

  if (error) {
    return <p className="status-message profile-error">{error}</p>
  }

  const completion = profile ? getProfileCompletion(profile) : null
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unreadCount, 0)
  const activeListings = listings.filter((post) => isPostLive(post)).length
  const recentConversations = conversations.slice(0, 5)
  const recentSaved = savedProfiles.slice(0, 4)

  return (
    <section className="card dashboard-page">
      <div className="discover-header">
        <div>
          <h2>My dashboard</h2>
          <p className="status-message">Your profile, connections, and messages in one place.</p>
        </div>
        <div className="discover-header-actions">
          <Link to="/profile/edit" className="secondary-button profile-action-link">
            Edit profile
          </Link>
          <Link to="/messages" className="primary-button profile-action-link">
            Messages{unreadTotal > 0 ? ` (${unreadTotal})` : ''}
          </Link>
        </div>
      </div>

      {!profile ? (
        <div className="dashboard-empty-profile">
          <h3>Your profile is waiting</h3>
          <p className="status-message">
            Signed in as {userEmail}. Create your profile to appear on the map and connect with
            the community.
          </p>
          <Link to="/profile/edit" className="primary-button profile-action-link">
            Create your profile
          </Link>
        </div>
      ) : (
        <div className="dashboard-profile-card">
          <div className="dashboard-profile-top">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="" className="dashboard-avatar" />
            ) : (
              <div className="dashboard-avatar dashboard-avatar-fallback">
                {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}

            <div>
              <p className="browse-type">
                {profile.profile_type === 'individual' ? 'Individual' : 'Business'}
              </p>
              <h3>
                {profile.name}
                {profile.is_verified ? <VerifiedBadge compact /> : null}
              </h3>
              {profile.location ? <p className="browse-meta">{profile.location}</p> : null}
              {profile.primary_category ? (
                <span className="tag tag-primary">
                  <CategoryLabel category={profile.primary_category} />
                </span>
              ) : null}
            </div>
          </div>

          <div className="dashboard-profile-actions">
            <Link to={`/profile/${userId}`} className="secondary-button profile-action-link">
              View public profile
            </Link>
            <Link to="/noticeboard/new" className="secondary-button profile-action-link">
              Post listing
            </Link>
          </div>

          {completion && completion.percent < 100 ? (
            <div className="completion-banner below-header">
              <div className="completion-copy">
                <strong>Profile {completion.percent}% complete</strong>
                <p>Add: {completion.missing.slice(0, 3).join(', ')}</p>
              </div>
              <Link to="/profile/edit" className="secondary-button profile-action-link">
                Finish profile
              </Link>
            </div>
          ) : null}
        </div>
      )}

      <div className="dashboard-stat-grid">
        <Link to="/messages" className="dashboard-stat-card dashboard-stat-link">
          <p className="dashboard-stat-value">{conversations.length}</p>
          <p className="dashboard-stat-label">Conversations</p>
          {unreadTotal > 0 ? (
            <p className="dashboard-stat-meta">{unreadTotal} unread</p>
          ) : null}
        </Link>
        <Link to="/saved" className="dashboard-stat-card dashboard-stat-link">
          <p className="dashboard-stat-value">{savedProfiles.length}</p>
          <p className="dashboard-stat-label">Saved profiles</p>
        </Link>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-value">{activeListings}</p>
          <p className="dashboard-stat-label">Active listings</p>
        </article>
      </div>

      {profile ? (
        <ProfileContactStats
          profileUserId={userId}
          profileName={profile.name}
          isOwnProfile
        />
      ) : null}

      <div className="dashboard-panels">
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Messages</h3>
            <Link to="/messages" className="secondary-button profile-action-link">
              Open inbox
            </Link>
          </div>

          {recentConversations.length === 0 ? (
            <p className="status-message">
              No messages yet. Browse members and tap Send message to start a conversation.
            </p>
          ) : (
            <div className="dashboard-connection-list">
              {recentConversations.map((conversation) => {
                const { profile: partner, lastMessage, unreadCount, partnerId } = conversation
                const name = partner?.name ?? 'Member'
                const isIncoming = lastMessage.recipient_id === userId

                return (
                  <Link
                    key={partnerId}
                    to={`/messages/${partnerId}`}
                    className={`dashboard-connection-item${unreadCount > 0 ? ' dashboard-connection-unread' : ''}`}
                  >
                    {partner?.profile_photo_url ? (
                      <img src={partner.profile_photo_url} alt="" className="messages-avatar" />
                    ) : (
                      <div className="messages-avatar messages-avatar-fallback">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="dashboard-connection-copy">
                      <div className="dashboard-connection-top">
                        <strong>
                          {name}
                          {partner?.is_verified ? <VerifiedBadge compact /> : null}
                        </strong>
                        <time dateTime={lastMessage.created_at}>
                          {formatMessageTime(lastMessage.created_at)}
                        </time>
                      </div>
                      <p className="dashboard-connection-preview">
                        {isIncoming ? '' : 'You: '}
                        {truncatePreview(lastMessage.body)}
                      </p>
                    </div>

                    {unreadCount > 0 ? (
                      <span className="messages-unread-badge">{unreadCount}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Connections</h3>
            <Link to="/discover" className="secondary-button profile-action-link">
              Find members
            </Link>
          </div>

          <p className="field-hint">
            People you have messaged and profiles you have saved.
          </p>

          {recentSaved.length === 0 && recentConversations.length === 0 ? (
            <p className="status-message">No connections yet.</p>
          ) : null}

          {recentSaved.length > 0 ? (
            <>
              <p className="field-label">Saved profiles</p>
              <div className="dashboard-connection-list">
                {recentSaved.map((savedProfile) => (
                  <Link
                    key={savedProfile.user_id}
                    to={`/profile/${savedProfile.user_id}`}
                    className="dashboard-connection-item"
                  >
                    {savedProfile.profile_photo_url ? (
                      <img
                        src={savedProfile.profile_photo_url}
                        alt=""
                        className="messages-avatar"
                      />
                    ) : (
                      <div className="messages-avatar messages-avatar-fallback">
                        {savedProfile.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="dashboard-connection-copy">
                      <strong>
                        {savedProfile.name}
                        {savedProfile.is_verified ? <VerifiedBadge compact /> : null}
                      </strong>
                      {savedProfile.location ? (
                        <p className="browse-meta">{savedProfile.location}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          {recentConversations.length > 0 ? (
            <>
              <p className="field-label">People you have messaged</p>
              <div className="dashboard-tag-list">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.partnerId}
                    to={`/messages/${conversation.partnerId}`}
                    className="tag"
                  >
                    {conversation.profile?.name ?? 'Member'}
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      {profile ? <ProfileListings userId={userId} isOwnProfile /> : null}
    </section>
  )
}
