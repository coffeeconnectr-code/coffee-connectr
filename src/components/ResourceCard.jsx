import { Link } from 'react-router-dom'
import CategoryLabel from './CategoryLabel'
import {
  formatFileSize,
  formatResourceDate,
  getResourceTypeIcon,
  getResourceTypeLabel,
} from '../lib/resourcesConstants'
import VerifiedBadge from './VerifiedBadge'

function truncateText(text, maxLength = 140) {
  if (!text || text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}…`
}

export default function ResourceCard({ resource }) {
  const fileSize = formatFileSize(resource.file_size)

  return (
    <article className="browse-card noticeboard-card resource-card">
      <div className="noticeboard-card-meta">
        <span className="tag tag-section">
          {getResourceTypeIcon(resource.post_type)} {getResourceTypeLabel(resource.post_type)}
        </span>
        {resource.post_type === 'document' && resource.file_name ? (
          <span className="resource-file-name">{resource.file_name}</span>
        ) : null}
      </div>

      <h3>
        <Link to={`/resources/${resource.id}`} className="noticeboard-card-link">
          {resource.title}
        </Link>
      </h3>

      <p className="browse-bio">{truncateText(resource.description)}</p>

      {resource.topic ? (
        <span className="tag tag-primary">
          <CategoryLabel category={resource.topic} />
        </span>
      ) : null}

      <div className="resource-card-action">
        {resource.post_type === 'link' ? (
          <span className="resource-action-label">Visit link</span>
        ) : (
          <span className="resource-action-label">
            Download{fileSize ? ` · ${fileSize}` : ''}
          </span>
        )}
      </div>

      <div className="noticeboard-card-footer">
        {resource.poster ? (
          <Link to={`/profile/${resource.poster.user_id}`} className="noticeboard-poster">
            {resource.poster.profile_photo_url ? (
              <img
                src={resource.poster.profile_photo_url}
                alt=""
                className="noticeboard-poster-avatar"
              />
            ) : (
              <span className="noticeboard-poster-avatar noticeboard-poster-fallback">
                {resource.poster.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            )}
            <span>
              {resource.poster.name}
              {resource.poster.is_verified ? <VerifiedBadge compact /> : null}
            </span>
          </Link>
        ) : null}
        <span className="noticeboard-date">{formatResourceDate(resource.created_at)}</span>
      </div>
    </article>
  )
}
