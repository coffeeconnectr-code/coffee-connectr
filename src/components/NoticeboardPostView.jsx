import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CategoryLabel from './CategoryLabel'
import {
  fetchNoticeboardPost,
  isPostLive,
  updateNoticeboardPostStatus,
  deleteNoticeboardPost,
} from '../lib/noticeboardApi'
import {
  formatPostDate,
  formatPostPrice,
  getSectionLabel,
  NOTICEBOARD_STATUS,
} from '../lib/noticeboardConstants'

export default function NoticeboardPostView({ postId, currentUserId = null }) {
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updating, setUpdating] = useState(false)

  const isOwner = currentUserId != null && post?.user_id === currentUserId
  const live = post ? isPostLive(post) : false

  useEffect(() => {
    let active = true

    async function loadPost() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchNoticeboardPost(postId)
        if (active) {
          setPost(data)
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

    loadPost()

    return () => {
      active = false
    }
  }, [postId])

  async function handleStatusChange(status) {
    setUpdating(true)
    setActionError('')

    try {
      const updated = await updateNoticeboardPostStatus(postId, status)
      setPost((current) => ({ ...current, ...updated }))
    } catch (statusError) {
      setActionError(statusError.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this listing permanently?')) {
      return
    }

    setUpdating(true)
    setActionError('')

    try {
      await deleteNoticeboardPost(postId)
      navigate('/noticeboard')
    } catch (deleteError) {
      setActionError(deleteError.message)
      setUpdating(false)
    }
  }

  if (loading) {
    return <p className="status-message">Loading listing...</p>
  }

  if (error) {
    return <p className="status-message profile-error">{error}</p>
  }

  if (!post) {
    return (
      <section className="card">
        <p className="status-message">This listing could not be found.</p>
        <Link to="/noticeboard" className="secondary-button profile-action-link">
          Back to noticeboard
        </Link>
      </section>
    )
  }

  const price = formatPostPrice(post)

  return (
    <section className="card noticeboard-post-view">
      {!live ? (
        <p className="noticeboard-status-banner">
          This listing is {NOTICEBOARD_STATUS[post.status]?.toLowerCase() ?? post.status}
          {post.status === 'active' ? ' (expired)' : ''}.
        </p>
      ) : null}

      <div className="noticeboard-post-header">
        <div>
          <span className="tag tag-section">{getSectionLabel(post.section)}</span>
          <h2>{post.title}</h2>
          {price ? <p className="noticeboard-price noticeboard-price-large">{price}</p> : null}
          <p className="browse-meta">
            {post.location ? `${post.location} · ` : ''}
            Posted {formatPostDate(post.created_at)}
            {post.expires_at ? ` · Expires ${formatPostDate(post.expires_at)}` : ''}
          </p>
        </div>
        <Link to="/noticeboard" className="secondary-button profile-action-link">
          Back
        </Link>
      </div>

      {(post.photo_urls?.length ?? 0) > 0 ? (
        <div className="noticeboard-photo-grid">
          {post.photo_urls.map((url) => (
            <img key={url} src={url} alt="" className="noticeboard-photo" />
          ))}
        </div>
      ) : null}

      <div className="noticeboard-post-body">{post.body}</div>

      {post.primary_category ? (
        <div className="noticeboard-post-tags">
          <span className="tag tag-primary">
            <CategoryLabel category={post.primary_category} />
          </span>
          {(post.secondary_categories ?? []).map((category) => (
            <span key={category} className="tag">
              <CategoryLabel category={category} />
            </span>
          ))}
        </div>
      ) : null}

      {post.poster ? (
        <div className="noticeboard-post-poster">
          <p className="field-label">Posted by</p>
          <Link to={`/profile/${post.poster.user_id}`} className="noticeboard-poster">
            {post.poster.profile_photo_url ? (
              <img src={post.poster.profile_photo_url} alt="" className="noticeboard-poster-avatar" />
            ) : (
              <span className="noticeboard-poster-avatar noticeboard-poster-fallback">
                {post.poster.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            )}
            <span>{post.poster.name}</span>
          </Link>
        </div>
      ) : null}

      {isOwner ? (
        <div className="noticeboard-owner-actions">
          <p className="field-label">Manage listing</p>
          <div className="noticeboard-owner-buttons">
            <Link to={`/noticeboard/${post.id}/edit`} className="secondary-button profile-action-link">
              Edit
            </Link>
            {post.status === 'active' ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={updating}
                  onClick={() => handleStatusChange('sold')}
                >
                  Mark sold
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={updating}
                  onClick={() => handleStatusChange('filled')}
                >
                  Mark filled
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="secondary-button profile-danger-button"
              disabled={updating}
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
          {actionError ? <p className="status-message profile-error">{actionError}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
