import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchProfileContact,
  profileMayShareContact,
  profileSharesContact,
} from '../lib/contactApi'

function ContactValue({ label, value, hrefPrefix }) {
  if (!value) {
    return null
  }

  const href = hrefPrefix === 'mailto' ? `mailto:${value}` : `tel:${value.replace(/\s/g, '')}`

  return (
    <div className="profile-detail">
      <dt>{label}</dt>
      <dd>
        <a href={href} className="contact-detail-link">
          {value}
        </a>
      </dd>
    </div>
  )
}

export default function ProfileContact({ profile, profileUserId, currentUserId, isOwnProfile }) {
  const [contact, setContact] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mayShareContact = profileMayShareContact(profile)
  const ownSharedContact = isOwnProfile && profileSharesContact(profile)

  async function handleRevealContact() {
    if (revealed || loading) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const details = await fetchProfileContact(profileUserId)
      setContact(details)
      setRevealed(true)

      if (!details.email && !details.phone) {
        setError('This member has not added contact details yet.')
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  if (isOwnProfile) {
    return (
      <section className="profile-section">
        <h3>Contact</h3>
        <p className="status-message">
          Choose which contact details members can reveal on your profile.
        </p>
        <dl className="profile-details">
          <ContactValue label="Email" value={profile.contact_email} hrefPrefix="mailto" />
          <ContactValue label="Phone" value={profile.contact_phone} hrefPrefix="tel" />
        </dl>
        {!ownSharedContact ? (
          <p className="profile-empty-hint">
            Add contact details in Edit profile and turn on sharing to let members reach you
            directly.
          </p>
        ) : (
          <p className="status-message">
            Shared publicly:{' '}
            {[
              profile.show_contact_email && profile.contact_email ? 'email' : null,
              profile.show_contact_phone && profile.contact_phone ? 'phone' : null,
            ]
              .filter(Boolean)
              .join(' and ')}
          </p>
        )}
        <Link to="/profile/edit" className="secondary-button profile-action-link">
          Edit contact details
        </Link>
      </section>
    )
  }

  if (!currentUserId) {
    return (
      <section className="profile-section">
        <h3>Contact</h3>
        <p className="status-message">
          Sign in to message this member or view their shared contact details.
        </p>
        <Link to="/sign-up" className="primary-button profile-action-link">
          Sign in to contact
        </Link>
      </section>
    )
  }

  return (
    <section className="profile-section">
      <h3>Contact</h3>
      <p className="status-message">
        Message this member on Coffee Connectr, or view their shared email and phone details.
      </p>

      <div className="profile-contact-actions">
        <Link to={`/messages/${profileUserId}`} className="primary-button profile-action-link">
          Send message
        </Link>
        {mayShareContact ? (
          <button
            type="button"
            className="secondary-button"
            onClick={handleRevealContact}
            disabled={loading || revealed}
          >
            {loading ? 'Loading...' : revealed ? 'Contact details shown' : 'View contact details'}
          </button>
        ) : null}
      </div>

      {error ? <p className="status-message profile-error">{error}</p> : null}

      {revealed && contact ? (
        <dl className="profile-details contact-details-revealed">
          <ContactValue label="Email" value={contact.email} hrefPrefix="mailto" />
          <ContactValue label="Phone" value={contact.phone} hrefPrefix="tel" />
          {!contact.email && !contact.phone && !error ? (
            <p className="status-message">No contact details are available right now.</p>
          ) : null}
        </dl>
      ) : null}

      {!mayShareContact ? (
        <p className="profile-empty-hint">
          This member has not shared direct contact details. You can still send a message.
        </p>
      ) : null}
    </section>
  )
}
