import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../lib/profileApi'
import { isFavourite } from '../lib/favouritesApi'
import { getProfileCompletion, getSocialLinks } from '../lib/profileCompletion'
import { formatBatchSize, formatCapacity, isRoastingProfile } from '../lib/roasterConstants'
import { OPEN_TO_OPTIONS } from '../lib/profileConstants'
import CategoryLabel from './CategoryLabel'
import FavouriteButton from './FavouriteButton'
import ProfileContact from './ProfileContact'
import ProfileMapPreview from './ProfileMapPreview'
import ProfileSkeleton from './ProfileSkeleton'

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
            <CategoryLabel category={value} />
          </span>
        ))}
      </dd>
    </div>
  )
}

function ProfileSection({ title, children }) {
  if (!children) {
    return null
  }

  return (
    <section className="profile-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export default function ProfileView({ userId, currentUserId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const isOwnProfile = userId === currentUserId

  useEffect(() => {
    let active = true

    async function loadSavedState() {
      if (!currentUserId || isOwnProfile) {
        if (active) {
          setIsSaved(false)
        }
        return
      }

      try {
        const saved = await isFavourite(currentUserId, userId)
        if (active) {
          setIsSaved(saved)
        }
      } catch {
        if (active) {
          setIsSaved(false)
        }
      }
    }

    loadSavedState()

    return () => {
      active = false
    }
  }, [currentUserId, userId, isOwnProfile])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchProfile(userId, currentUserId)
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

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <section className="card profile-view-empty">
        <h2>Something went wrong</h2>
        <p className="status-message profile-error">{error}</p>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="card profile-view-empty">
        <div className="empty-icon">☕</div>
        <h2>{isOwnProfile ? 'Your profile is waiting' : 'Profile not found'}</h2>
        <p className="status-message">
          {isOwnProfile
            ? 'Introduce yourself to the coffee community with a photo, bio, and location.'
            : 'This user has not published a profile yet.'}
        </p>
        {isOwnProfile ? (
          <>
            <ul className="empty-checklist">
              <li>Add your name and photo</li>
              <li>Choose your coffee categories</li>
              <li>Drop a pin on the map</li>
            </ul>
            <Link to="/profile/edit" className="primary-button profile-action-link">
              Create your profile
            </Link>
          </>
        ) : null}
      </section>
    )
  }

  const isIndividual = profile.profile_type === 'individual'
  const hasMap = profile.latitude != null && profile.longitude != null
  const completion = isOwnProfile ? getProfileCompletion(profile) : null
  const socialLinks = getSocialLinks(profile)

  const aboutSection = (
    <>
      {profile.about_bio ? <p className="profile-bio">{profile.about_bio}</p> : null}
      {socialLinks.length ? (
        <div className="profile-social-links">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="social-link"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <TagList label="Secondary categories" values={profile.secondary_categories} />
    </>
  )

  const detailsSection = isIndividual ? (
    <dl className="profile-details">
      <Detail label="Years of experience" value={profile.years_of_experience} />
      <TagList label="Skills / specialties" values={profile.skills_specialties} />
      <Detail label="Certifications" value={profile.certifications} />
      <Detail label="Open to" value={formatOpenTo(profile.open_to_status)} />
      <TagList label="Languages" values={profile.languages} />
    </dl>
  ) : (
    <dl className="profile-details">
      <Detail label="Year established" value={profile.year_established} />
      <Detail label="Team size" value={profile.team_size} />
      <Detail label="Services offered" value={profile.services_offered} />
      <Detail label="Opening hours" value={profile.opening_hours} />
    </dl>
  )

  const showAboutSection =
    profile.about_bio || socialLinks.length || (profile.secondary_categories?.length ?? 0) > 0
  const showDetailsSection =
    isIndividual
      ? profile.years_of_experience ||
        profile.skills_specialties?.length ||
        profile.certifications ||
        profile.open_to_status?.length ||
        profile.languages?.length
      : profile.year_established ||
        profile.team_size ||
        profile.services_offered ||
        profile.opening_hours

  const roasters = profile.profile_roasters ?? []
  const showRoastingSection =
    roasters.length > 0 ||
    profile.total_roasting_capacity_kg != null ||
    profile.contract_roasting_capacity_kg != null

  return (
    <article className="profile-view">
      <div
        className="profile-cover"
        style={profile.cover_image_url ? { backgroundImage: `url(${profile.cover_image_url})` } : undefined}
      >
        {!profile.cover_image_url ? <span className="cover-placeholder">Coffee Connectr</span> : null}
      </div>

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
                <div className="profile-owner-actions">
                  <Link to="/profile/edit" className="secondary-button profile-action-link">
                    Edit profile
                  </Link>
                  <button type="button" className="secondary-button" onClick={handleCopyLink}>
                    {copied ? 'Link copied' : 'Copy link'}
                  </button>
                </div>
              ) : currentUserId ? (
                <div className="profile-owner-actions">
                  <Link to={`/messages/${userId}`} className="primary-button profile-action-link">
                    Send message
                  </Link>
                  <FavouriteButton
                    currentUserId={currentUserId}
                    profileUserId={userId}
                    initialSaved={isSaved}
                  />
                </div>
              ) : null}
            </div>

            {profile.primary_category ? (
              <span className="tag tag-primary">
                <CategoryLabel category={profile.primary_category} />
              </span>
            ) : null}
          </div>
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

        {showAboutSection ? (
          <ProfileSection title="About">{aboutSection}</ProfileSection>
        ) : isOwnProfile ? (
          <p className="profile-empty-hint">Add a bio and links in Edit profile to tell your story.</p>
        ) : null}

        {hasMap ? (
          <ProfileSection title="Location">
            <ProfileMapPreview
              latitude={profile.latitude}
              longitude={profile.longitude}
              location={profile.location}
              primaryCategory={profile.primary_category}
            />
          </ProfileSection>
        ) : profile.location ? (
          <ProfileSection title="Location">
            <Detail label="Location" value={profile.location} />
          </ProfileSection>
        ) : isOwnProfile ? (
          <p className="profile-empty-hint">Add a map pin in Edit profile so people know where you are.</p>
        ) : null}

        {showRoastingSection ? (
          <ProfileSection title="Roasting equipment">
            {roasters.length ? (
              <div className="roaster-machine-list">
                {roasters.map((machine) => (
                  <div key={machine.id} className="roaster-machine-card">
                    <strong>{machine.roaster_brand}</strong>
                    <span>{formatBatchSize(machine.batch_size_kg)} batch size</span>
                  </div>
                ))}
              </div>
            ) : null}
            <dl className="profile-details">
              <Detail
                label="Total roasting capacity"
                value={formatCapacity(profile.total_roasting_capacity_kg)}
              />
              <Detail
                label="Contract roasting available"
                value={formatCapacity(profile.contract_roasting_capacity_kg)}
              />
            </dl>
          </ProfileSection>
        ) : isOwnProfile && isRoastingProfile(profile) ? (
          <p className="profile-empty-hint">
            Add your roasters and capacity in Edit profile so members can find you for contract
            roasting.
          </p>
        ) : null}

        {showDetailsSection ? (
          <ProfileSection title={isIndividual ? 'Experience' : 'Business details'}>
            {detailsSection}
          </ProfileSection>
        ) : null}

        <ProfileContact
          profile={profile}
          profileUserId={userId}
          currentUserId={currentUserId}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </article>
  )
}
