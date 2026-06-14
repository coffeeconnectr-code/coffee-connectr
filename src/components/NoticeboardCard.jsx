import { Link } from 'react-router-dom'
import CategoryLabel from './CategoryLabel'
import {
  formatPostDate,
  formatPostPrice,
  getSectionLabel,
} from '../lib/noticeboardConstants'
import VerifiedBadge from './VerifiedBadge'

function truncateText(text, maxLength = 140) {
  if (!text || text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}…`
}

export default function NoticeboardCard({ post }) {
  const price = formatPostPrice(post)
  const coverPhoto = post.photo_urls?.[0] ?? null

  return (
    <article className="browse-card noticeboard-card">
      {coverPhoto ? (
        <img src={coverPhoto} alt="" className="noticeboard-card-photo" />
      ) : null}

      <div className="noticeboard-card-meta">
        <span className="tag tag-section">{getSectionLabel(post.section)}</span>
        {price ? <span className="noticeboard-price">{price}</span> : null}
      </div>

      <h3>
        <Link to={`/noticeboard/${post.id}`} className="noticeboard-card-link">
          {post.title}
        </Link>
      </h3>

      {post.location ? <p className="browse-meta">{post.location}</p> : null}

      <p className="browse-bio">{truncateText(post.body)}</p>

      {post.primary_category ? (
        <span className="tag tag-primary">
          <CategoryLabel category={post.primary_category} />
        </span>
      ) : null}

      <div className="noticeboard-card-footer">
        {post.poster ? (
          <Link to={`/profile/${post.poster.user_id}`} className="noticeboard-poster">
            {post.poster.profile_photo_url ? (
              <img src={post.poster.profile_photo_url} alt="" className="noticeboard-poster-avatar" />
            ) : (
              <span className="noticeboard-poster-avatar noticeboard-poster-fallback">
                {post.poster.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            )}
            <span>
              {post.poster.name}
              {post.poster.is_verified ? <VerifiedBadge compact /> : null}
            </span>
          </Link>
        ) : null}
        <span className="noticeboard-date">{formatPostDate(post.created_at)}</span>
      </div>
    </article>
  )
}
