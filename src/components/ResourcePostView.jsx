import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CategoryLabel from './CategoryLabel'
import {
  deleteResourcePost,
  fetchResourcePost,
  isResourceActive,
  updateResourcePostStatus,
} from '../lib/resourcesApi'
import {
  formatFileSize,
  formatResourceDate,
  getResourceTypeIcon,
  getResourceTypeLabel,
  RESOURCE_STATUS,
} from '../lib/resourcesConstants'
import VerifiedBadge from './VerifiedBadge'

export default function ResourcePostView({ resourceId, currentUserId = null }) {
  const navigate = useNavigate()
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updating, setUpdating] = useState(false)

  const isOwner = currentUserId != null && resource?.user_id === currentUserId
  const active = resource ? isResourceActive(resource) : false

  useEffect(() => {
    let mounted = true

    async function loadResource() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchResourcePost(resourceId)
        if (mounted) {
          setResource(data)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadResource()

    return () => {
      mounted = false
    }
  }, [resourceId])

  async function handleStatusChange(status) {
    setUpdating(true)
    setActionError('')

    try {
      const updated = await updateResourcePostStatus(resourceId, status)
      setResource((current) => ({ ...current, ...updated }))
    } catch (statusError) {
      setActionError(statusError.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this resource permanently?')) {
      return
    }

    setUpdating(true)
    setActionError('')

    try {
      await deleteResourcePost(resourceId)
      navigate('/resources')
    } catch (deleteError) {
      setActionError(deleteError.message)
      setUpdating(false)
    }
  }

  if (loading) {
    return <p className="status-message">Loading resource...</p>
  }

  if (error) {
    return <p className="status-message profile-error">{error}</p>
  }

  if (!resource) {
    return (
      <section className="card">
        <p className="status-message">This resource could not be found.</p>
        <Link to="/resources" className="secondary-button profile-action-link">
          Back to tools & resources
        </Link>
      </section>
    )
  }

  const fileSize = formatFileSize(resource.file_size)

  return (
    <section className="card noticeboard-post-view resource-post-view">
      {!active ? (
        <p className="noticeboard-status-banner">
          This resource is {RESOURCE_STATUS[resource.status]?.toLowerCase() ?? resource.status}.
        </p>
      ) : null}

      <div className="noticeboard-post-header">
        <div>
          <p className="info-eyebrow">
            {getResourceTypeIcon(resource.post_type)} {getResourceTypeLabel(resource.post_type)}
          </p>
          <h2>{resource.title}</h2>
          <p className="browse-meta">Shared {formatResourceDate(resource.created_at)}</p>
        </div>
        <Link to="/resources" className="secondary-button profile-action-link">
          Back
        </Link>
      </div>

      {resource.poster ? (
        <Link to={`/profile/${resource.poster.user_id}`} className="noticeboard-poster resource-poster">
          {resource.poster.profile_photo_url ? (
            <img src={resource.poster.profile_photo_url} alt="" className="noticeboard-poster-avatar" />
          ) : (
            <span className="noticeboard-poster-avatar noticeboard-poster-fallback">
              {resource.poster.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          )}
          <span>
            Shared by {resource.poster.name}
            {resource.poster.is_verified ? <VerifiedBadge compact /> : null}
          </span>
        </Link>
      ) : null}

      <div className="noticeboard-post-tags">
        {resource.topic ? (
          <span className="tag tag-primary">
            <CategoryLabel category={resource.topic} />
          </span>
        ) : null}
      </div>

      <div className="noticeboard-post-body">
        <p>{resource.description}</p>
      </div>

      <div className="resource-access-panel">
        {resource.post_type === 'link' && resource.external_url ? (
          <a
            href={resource.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button profile-action-link"
          >
            Open link
          </a>
        ) : resource.post_type === 'link' ? (
          <p className="status-message">No link URL provided for this resource.</p>
        ) : (
          <div className="resource-document-panel">
            <p className="resource-document-name">
              <strong>{resource.file_name ?? 'Document'}</strong>
              {fileSize ? <span> · {fileSize}</span> : null}
            </p>
            <a
              href={resource.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button profile-action-link"
            >
              Download document
            </a>
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="noticeboard-owner-actions">
          <p className="status-message">You shared this resource.</p>
          <div className="noticeboard-owner-buttons">
            <Link
              to={`/resources/${resource.id}/edit`}
              className="secondary-button profile-action-link"
            >
              Edit
            </Link>
            {active ? (
              <button
                type="button"
                className="secondary-button"
                disabled={updating}
                onClick={() => handleStatusChange('archived')}
              >
                Archive
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                disabled={updating}
                onClick={() => handleStatusChange('active')}
              >
                Restore
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={updating}
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? <p className="status-message profile-error">{actionError}</p> : null}
    </section>
  )
}
