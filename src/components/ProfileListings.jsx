import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUserNoticeboardPosts, isPostLive } from '../lib/noticeboardApi'
import {
  formatPostDate,
  formatPostPrice,
  getSectionLabel,
  NOTICEBOARD_STATUS,
} from '../lib/noticeboardConstants'

function listingStatus(post) {
  if (isPostLive(post)) {
    return 'active'
  }

  if (post.status === 'active' && post.expires_at && new Date(post.expires_at) <= new Date()) {
    return 'expired'
  }

  return post.status
}

export default function ProfileListings({ userId, isOwnProfile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPosts() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchUserNoticeboardPosts(userId, { includeAll: isOwnProfile })
        if (active) {
          setPosts(data)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
          setPosts([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPosts()

    return () => {
      active = false
    }
  }, [userId, isOwnProfile])

  if (loading) {
    return (
      <section className="profile-section">
        <h3>{isOwnProfile ? 'My listings' : 'Listings'}</h3>
        <p className="status-message">Loading listings...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="profile-section">
        <h3>{isOwnProfile ? 'My listings' : 'Listings'}</h3>
        <p className="status-message profile-error">{error}</p>
      </section>
    )
  }

  if (!isOwnProfile && posts.length === 0) {
    return null
  }

  return (
    <section className="profile-section">
      <div className="profile-listings-header">
        <h3>{isOwnProfile ? 'My listings' : 'Listings'}</h3>
        {isOwnProfile ? (
          <Link to="/noticeboard/new" className="secondary-button profile-action-link">
            Post listing
          </Link>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <p className="profile-empty-hint">
          You have not posted any listings yet. Share equipment for sale, job openings, or events
          with the community.
        </p>
      ) : (
        <div className="profile-listings">
          {posts.map((post) => {
            const status = listingStatus(post)
            const price = formatPostPrice(post)

            return (
              <article key={post.id} className="profile-listing-card">
                <div className="profile-listing-top">
                  <div>
                    <span className="tag tag-section">{getSectionLabel(post.section)}</span>
                    <h4>
                      <Link to={`/noticeboard/${post.id}`}>{post.title}</Link>
                    </h4>
                    <p className="browse-meta">
                      {post.location ? `${post.location} · ` : ''}
                      Posted {formatPostDate(post.created_at)}
                      {price ? ` · ${price}` : ''}
                    </p>
                  </div>
                  {isOwnProfile && status !== 'active' ? (
                    <span className={`profile-listing-status profile-listing-status-${status}`}>
                      {NOTICEBOARD_STATUS[status] ?? status}
                    </span>
                  ) : null}
                </div>

                {isOwnProfile ? (
                  <div className="profile-listing-actions">
                    <Link
                      to={`/noticeboard/${post.id}/edit`}
                      className="secondary-button profile-action-link"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/noticeboard/${post.id}`}
                      className="secondary-button profile-action-link"
                    >
                      View
                    </Link>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
