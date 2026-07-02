import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminSendFreeProfileInvite,
  fetchAdminFreeProfileInvites,
} from '../../lib/adminApi'
import AdminMemberBenefitGrant from './AdminMemberBenefitGrant'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'contact', label: 'Contact requests' },
  { value: 'invited', label: 'Invited' },
  { value: 'redeemed', label: 'Redeemed' },
]

function statusLabel(status) {
  if (status === 'contact') {
    return 'Contact request'
  }

  if (status === 'invited') {
    return 'Invite sent'
  }

  if (status === 'redeemed') {
    return 'Profile created'
  }

  return status
}

export default function AdminFreeProfiles() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [invites, setInvites] = useState([])
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingInviteId, setSendingInviteId] = useState('')
  const [sendingDirect, setSendingDirect] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadInvites(searchTerm = search, status = statusFilter, { keepFeedback = false } = {}) {
    setLoading(true)

    if (!keepFeedback) {
      setError('')
      setActionError('')
      setSuccessMessage('')
    }

    try {
      setInvites(await fetchAdminFreeProfileInvites(searchTerm, status))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (active) {
        void loadInvites('', '')
      }
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleSendInvite(invite) {
    const actionLabel = invite.status === 'invited' ? 'Resend' : 'Send'
    const confirmed = window.confirm(
      `${actionLabel} free profile invite email to ${invite.email}?`,
    )

    if (!confirmed) {
      return
    }

    setSendingInviteId(invite.id)
    setActionError('')
    setSuccessMessage('')

    try {
      await adminSendFreeProfileInvite({ inviteId: invite.id })
      await loadInvites(search, statusFilter, { keepFeedback: true })
      setSuccessMessage(`Free profile invite sent to ${invite.email}.`)
    } catch (sendError) {
      setActionError(sendError.message)
    } finally {
      setSendingInviteId('')
    }
  }

  async function handleDirectSend(event) {
    event.preventDefault()
    setSendingDirect(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const trimmedEmail = contactEmail.trim()
      await adminSendFreeProfileInvite({
        contactName: contactName.trim(),
        email: trimmedEmail,
      })
      setContactName('')
      setContactEmail('')
      await loadInvites(search, statusFilter, { keepFeedback: true })
      setSuccessMessage(`Free profile invite sent to ${trimmedEmail}.`)
    } catch (sendError) {
      setActionError(sendError.message)
    } finally {
      setSendingDirect(false)
    }
  }

  return (
    <div className="admin-panel">
      <h3>Free profile</h3>
      <p className="status-message">
        Send someone a link to create a free Coffee Connectr profile for life, or review requests
        from the{' '}
        <Link to="/contact?topic=free_profile">contact form</Link>.
      </p>

      <form className="admin-search-row" onSubmit={handleDirectSend}>
        <input
          type="text"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          placeholder="Name"
          required
          maxLength={120}
        />
        <input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="Email"
          required
          maxLength={254}
        />
        <button type="submit" className="secondary-button" disabled={sendingDirect}>
          {sendingDirect ? 'Sending...' : 'Send invite email'}
        </button>
      </form>

      <AdminMemberBenefitGrant benefitType="lifetime_free" />

      <h4 className="admin-subheading">Invites and contact requests</h4>

      <div className="admin-tab-row">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            className={`noticeboard-pill${
              statusFilter === filter.value ? ' noticeboard-pill-active' : ''
            }`}
            onClick={() => {
              setStatusFilter(filter.value)
              void loadInvites(search, filter.value)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="admin-search-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or message"
        />
        <button type="button" className="secondary-button" onClick={() => loadInvites(search, statusFilter)}>
          Search
        </button>
      </div>

      {loading ? <p className="status-message">Loading...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}
      {actionError ? <p className="status-message profile-error">{actionError}</p> : null}
      {successMessage ? <p className="status-message">{successMessage}</p> : null}

      <div className="admin-table">
        {invites.map((invite) => (
          <article key={invite.id} className="admin-row">
            <div>
              <strong>{invite.contact_name}</strong>
              <p className="browse-meta">{invite.email}</p>
              <p className="browse-meta">
                {statusLabel(invite.status)}
                {' · '}
                {invite.source === 'contact' ? 'Contact form' : 'Admin'}
                {' · '}
                Requested {new Date(invite.created_at).toLocaleDateString()}
                {invite.invited_at
                  ? ` · Invited ${new Date(invite.invited_at).toLocaleDateString()}`
                  : ''}
                {invite.redeemed_at
                  ? ` · Joined ${new Date(invite.redeemed_at).toLocaleDateString()}`
                  : ''}
              </p>
              {invite.contact_message ? (
                <p className="browse-meta">{invite.contact_message}</p>
              ) : null}
            </div>
            <div className="admin-row-actions">
              {invite.status !== 'redeemed' ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={sendingInviteId === invite.id}
                  onClick={() => handleSendInvite(invite)}
                >
                  {sendingInviteId === invite.id
                    ? 'Sending...'
                    : invite.status === 'invited'
                      ? 'Resend invite'
                      : 'Send invite email'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!loading && invites.length === 0 ? (
        <p className="status-message">No free profile requests match that search.</p>
      ) : null}
    </div>
  )
}
