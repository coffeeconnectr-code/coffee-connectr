import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../lib/profileApi'
import { OPEN_TO_OPTIONS } from '../lib/profileConstants'
import ProfileMapPreview from './ProfileMapPreview'

function formatOpenTo(values) {
  return values
    .map((value) => OPEN_TO_OPTIONS.find((option) => option.value === value)?.label ?? value)
    .join(', ')
}

function Detail({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null
  }

  return (
    <div className="profile-detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function TagList({ label, values }) {
  if (!values?.length) {
    return null
  }

  return (
    <div className="profile-detail">
      <dt>{label}</dt>
      <dd className="tag-list">
        {values.map((value) => (
          <span key={value} className="tag">
            {value}
          </span>
        ))}
      </dd>
    </div>
  )
}

export default function ProfileView({ userId, currentUserId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isOwnProfile = userId === currentUserId

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchProfile(userId)
        if (active) {
          setProfile(data)
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

    loadProfile()

    return () => {
      active = false
    }
  }, [userId])

  if (loading) {
    return <p className="status-message">Loading profile...</p>
  }

  if (error) {
    return <p className="status-message profile-error">{error}</p>
  }

  if (!profile) {
    return (
      <section className="card profile-view-empty">
        <h2>Profile not found</h2>
        <p className="status-message">
          {isOwnProfile
            ? 'You have not created a profile yet.'
            : 'This user has not published a profile yet.'}
        </p>
        {isOwnProfile ? (
          <Link to="/profile/edit" className="primary-button profile-action-link">
            Create your profile
          </Link>
        ) : null}
      </section>
    )
  }

  const isIndividual = profile.profile_type === 'individual'
  const hasMap = profile.latitude != null && profile.longitude != null

  return (
    <article className="profile-view">
      <div
        className="profile-cover"
        style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})` } : undefined}
      />

      <div className="profile-view-body card">
        <div className="profile-view-top">
          <div className="profile-avatar-wrap">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar-fallback">
                {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="profile-view-heading">
            <div className="profile-title-row">
              <div>
                <p className="profile-type-badge">
                  {isIndividual ? 'Individual' : 'Business'}
                </p>
                <h2>{profile.name}</h2>
                {isIndividual && profile.job_title_role ? (
                  <p className="profile-headline">{profile.job_title_role}</p>
                ) : null}
                {!isIndividual && profile.business_type ? (
                  <p className="profile-headline">{profile.business_type}</p>
                ) : null}
              </div>

              {isOwnProfile ? (
                <Link to="/profile/edit" className="secondary-button profile-action-link">
                  Edit profile
                </Link>
              ) : null}
            </div>

            {profile.primary_category ? (
              <span className="tag tag-primary">{profile.primary_category}</span>
            ) : null}
          </div>
        </div>

        {profile.about_bio ? <p className="profile-bio">{profile.about_bio}</p> : null}

        {profile.website ? (
          <p className="profile-website">
            <a href={profile.website} target="_blank" rel="noreferrer">
              {profile.website}
            </a>
          </p>
        ) : null}

        <TagList label="Secondary categories" values={profile.secondary_categories} />

        {hasMap ? (
          <ProfileMapPreview
            latitude={profile.latitude}
            longitude={profile.longitude}
            location={profile.location}
          />
        ) : profile.location ? (
          <Detail label="Location" value={profile.location} />
        ) : null}

        <dl className="profile-details">
          {isIndividual ? (
            <>
              <Detail label="Years of experience" value={profile.years_of_experience} />
              <TagList label="Skills / specialties" values={profile.skills_specialties} />
              <Detail label="Certifications" value={profile.certifications} />
              <Detail label="Open to" value={formatOpenTo(profile.open_to_status)} />
              <TagList label="Languages" values={profile.languages} />
            </>
          ) : (
            <>
              <Detail label="Year established" value={profile.year_established} />
              <Detail label="Team size" value={profile.team_size} />
              <Detail label="Services offered" value={profile.services_offered} />
              <Detail label="Opening hours" value={profile.opening_hours} />
            </>
          )}
        </dl>
      </div>
    </article>
  )
}
