import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LocationPicker from './LocationPicker'
import { CATEGORIES } from '../lib/profileConstants'
import {
  createNoticeboardPost,
  fetchNoticeboardPost,
  updateNoticeboardPost,
  uploadNoticeboardPhoto,
} from '../lib/noticeboardApi'
import {
  DEFAULT_LISTING_DAYS,
  NOTICEBOARD_SECTIONS,
  PRICE_SECTIONS,
} from '../lib/noticeboardConstants'

const MAX_PHOTOS = 4

function defaultExpiresAtInput() {
  const date = new Date()
  date.setDate(date.getDate() + DEFAULT_LISTING_DAYS)
  return date.toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    section: 'listings',
    title: '',
    body: '',
    primary_category: '',
    secondary_categories: [],
    location: '',
    latitude: null,
    longitude: null,
    price_amount: '',
    price_currency: 'USD',
    price_label: '',
    photo_urls: [],
    expires_at: defaultExpiresAtInput(),
  }
}

export default function NoticeboardForm({ userId, postId = null }) {
  const navigate = useNavigate()
  const isEditing = postId != null

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) {
      return
    }

    let active = true

    async function loadPost() {
      setLoading(true)
      setError('')

      try {
        const post = await fetchNoticeboardPost(postId)

        if (!post) {
          throw new Error('Listing not found')
        }

        if (post.user_id !== userId) {
          throw new Error('You can only edit your own listings')
        }

        if (active) {
          setForm({
            section: post.section,
            title: post.title,
            body: post.body,
            primary_category: post.primary_category ?? '',
            secondary_categories: post.secondary_categories ?? [],
            location: post.location ?? '',
            latitude: post.latitude,
            longitude: post.longitude,
            price_amount: post.price_amount ?? '',
            price_currency: post.price_currency ?? 'USD',
            price_label: post.price_label ?? '',
            photo_urls: post.photo_urls ?? [],
            expires_at: post.expires_at.slice(0, 10),
          })
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
  }, [isEditing, postId, userId])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleSecondaryCategory(category) {
    setForm((current) => {
      const selected = new Set(current.secondary_categories)
      if (selected.has(category)) {
        selected.delete(category)
      } else {
        selected.add(category)
      }
      return { ...current, secondary_categories: [...selected] }
    })
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !Array.isArray(form.photo_urls) || form.photo_urls.length >= MAX_PHOTOS) {
      return
    }

    setUploading(true)
    setError('')

    try {
      const url = await uploadNoticeboardPhoto(file, userId)
      setForm((current) => ({
        ...current,
        photo_urls: [...current.photo_urls, url],
      }))
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  function removePhoto(url) {
    setForm((current) => ({
      ...current,
      photo_urls: current.photo_urls.filter((item) => item !== url),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      section: form.section,
      title: form.title,
      body: form.body,
      primary_category: form.primary_category,
      secondary_categories: form.secondary_categories.filter(
        (category) => category !== form.primary_category,
      ),
      location: form.location,
      latitude: form.latitude,
      longitude: form.longitude,
      price_amount: form.price_amount === '' ? null : Number(form.price_amount),
      price_currency: form.price_currency,
      price_label: form.price_label,
      photo_urls: form.photo_urls,
      expires_at: new Date(`${form.expires_at}T23:59:59`).toISOString(),
    }

    try {
      if (isEditing) {
        await updateNoticeboardPost(postId, payload)
        navigate(`/noticeboard/${postId}`)
      } else {
        const created = await createNoticeboardPost(userId, payload)
        navigate(`/noticeboard/${created.id}`)
      }
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  const showPrice = PRICE_SECTIONS.has(form.section)

  if (loading) {
    return <p className="status-message">Loading listing...</p>
  }

  return (
    <section className="card noticeboard-form-card">
      <div className="discover-header">
        <div>
          <h2>{isEditing ? 'Edit listing' : 'Post a listing'}</h2>
          <p className="status-message">
            Listings expire after {DEFAULT_LISTING_DAYS} days by default. You can mark them sold or
            filled anytime.
          </p>
        </div>
        <Link to="/noticeboard" className="secondary-button profile-action-link">
          Cancel
        </Link>
      </div>

      <form className="profile-form noticeboard-form" onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Listing details</legend>

          <label>
            Section
            <select
              value={form.section}
              onChange={(event) => updateField('section', event.target.value)}
              required
            >
              <optgroup label="Core">
                {NOTICEBOARD_SECTIONS.filter((item) => item.group === 'core').map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="More">
                {NOTICEBOARD_SECTIONS.filter((item) => item.group === 'additions').map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Short headline for your listing"
              required
              maxLength={120}
            />
          </label>

          <label>
            Description
            <textarea
              value={form.body}
              onChange={(event) => updateField('body', event.target.value)}
              placeholder="Full details — condition, terms, availability, etc."
              rows={8}
              required
            />
          </label>

          <label>
            Expiry date
            <input
              type="date"
              value={form.expires_at}
              onChange={(event) => updateField('expires_at', event.target.value)}
              required
            />
          </label>
        </fieldset>

        {showPrice ? (
          <fieldset className="form-section">
            <legend>Price</legend>

            <label>
              Amount (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_amount}
                onChange={(event) => updateField('price_amount', event.target.value)}
                placeholder="e.g. 5000"
              />
            </label>

            <label>
              Currency
              <input
                type="text"
                value={form.price_currency}
                onChange={(event) => updateField('price_currency', event.target.value)}
                placeholder="USD"
                maxLength={3}
              />
            </label>

            <label>
              Price label (optional)
              <input
                type="text"
                value={form.price_label}
                onChange={(event) => updateField('price_label', event.target.value)}
                placeholder="POA, negotiable, from $200/day"
              />
            </label>
          </fieldset>
        ) : null}

        <fieldset className="form-section">
          <legend>Categories</legend>

          <label>
            Primary category
            <select
              value={form.primary_category}
              onChange={(event) => updateField('primary_category', event.target.value)}
            >
              <option value="">None</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="checkbox-grid">
            {CATEGORIES.map((category) => (
              <label key={category} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.secondary_categories.includes(category)}
                  onChange={() => toggleSecondaryCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Location</legend>
          <LocationPicker
            location={form.location}
            latitude={form.latitude}
            longitude={form.longitude}
            primaryCategory={form.primary_category}
            onChange={(nextLocation) => {
              setForm((current) => ({
                ...current,
                location: nextLocation.location,
                latitude: nextLocation.latitude,
                longitude: nextLocation.longitude,
              }))
            }}
          />
        </fieldset>

        <fieldset className="form-section">
          <legend>Photos</legend>
          <p className="field-hint">Up to {MAX_PHOTOS} images. First image is the cover.</p>

          {(form.photo_urls?.length ?? 0) > 0 ? (
            <div className="noticeboard-photo-grid">
              {form.photo_urls.map((url) => (
                <div key={url} className="noticeboard-photo-thumb">
                  <img src={url} alt="" />
                  <button type="button" className="secondary-button" onClick={() => removePhoto(url)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {form.photo_urls.length < MAX_PHOTOS ? (
            <label>
              {uploading ? 'Uploading...' : 'Add photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          ) : null}
        </fieldset>

        {error ? <p className="status-message profile-error">{error}</p> : null}

        <button type="submit" className="primary-button" disabled={saving || uploading}>
          {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Publish listing'}
        </button>
      </form>
    </section>
  )
}
