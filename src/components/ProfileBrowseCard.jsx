import { Link } from 'react-router-dom'
import CategoryLabel from './CategoryLabel'

function truncateText(text, maxLength = 120) {
  if (!text || text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}…`
}

export default function ProfileBrowseCard({ profile }) {
  const isIndividual = profile.profile_type === 'individual'

  return (
    <article className="browse-card">
      <div className="browse-card-top">
        {profile.profile_photo_url ? (
          <img src={profile.profile_photo_url} alt="" className="browse-avatar" />
        ) : (
          <div className="browse-avatar browse-avatar-fallback">
            {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="browse-card-copy">
          <p className="browse-type">{isIndividual ? 'Individual' : 'Business'}</p>
          <h3>{profile.name}</h3>
          {profile.location ? <p className="browse-meta">{profile.location}</p> : null}
        </div>
      </div>

      {profile.primary_category ? (
        <span className="tag tag-primary">
          <CategoryLabel category={profile.primary_category} />
        </span>
      ) : null}

      {profile.about_bio ? (
        <p className="browse-bio">{truncateText(profile.about_bio)}</p>
      ) : null}

      {(profile.secondary_categories?.length ?? 0) > 0 ? (
        <div className="browse-tags">
          {profile.secondary_categories.slice(0, 3).map((category) => (
            <span key={category} className="tag">
              <CategoryLabel category={category} />
            </span>
          ))}
        </div>
      ) : null}

      <Link to={`/profile/${profile.user_id}`} className="secondary-button profile-action-link">
        View profile
      </Link>
    </article>
  )
}
