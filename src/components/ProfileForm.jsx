import { useEffect, useState } from 'react'
import {
  CATEGORIES,
  OPEN_TO_OPTIONS,
  joinList,
  splitList,
} from '../lib/profileConstants'
import { fetchProfile, saveProfile, uploadProfileImage } from '../lib/profileApi'

const emptyForm = {
  profile_type: 'individual',
  name: '',
  profile_photo_url: '',
  cover_image_url: '',
  location: '',
  primary_category: '',
  secondary_categories: [],
  about_bio: '',
  website: '',
  job_title_role: '',
  years_of_experience: '',
  skills_specialties: '',
  certifications: '',
  open_to_status: [],
  languages: '',
  business_type: '',
  year_established: '',
  team_size: '',
  services_offered: '',
  opening_hours: '',
}

function profileToForm(profile) {
  if (!profile) {
    return { ...emptyForm }
  }

  return {
    profile_type: profile.profile_type ?? 'individual',
    name: profile.name ?? '',
    profile_photo_url: profile.profile_photo_url ?? '',
    cover_image_url: profile.cover_image_url ?? '',
    location: profile.location ?? '',
    primary_category: profile.primary_category ?? '',
    secondary_categories: profile.secondary_categories ?? [],
    about_bio: profile.about_bio ?? '',
    website: profile.website ?? '',
    job_title_role: profile.job_title_role ?? '',
    years_of_experience: profile.years_of_experience?.toString() ?? '',
    skills_specialties: joinList(profile.skills_specialties),
    certifications: profile.certifications ?? '',
    open_to_status: profile.open_to_status ?? [],
    languages: joinList(profile.languages),
    business_type: profile.business_type ?? '',
    year_established: profile.year_established?.toString() ?? '',
    team_size: profile.team_size ?? '',
    services_offered: profile.services_offered ?? '',
    opening_hours: profile.opening_hours ?? '',
  }
}

export default function ProfileForm({ userId, userEmail }) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setMessage('')

      try {
        const profile = await fetchProfile(userId)
        if (active) {
          setForm(profileToForm(profile))
        }
      } catch (error) {
        if (active) {
          setMessage(error.message)
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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleArrayValue(field, value) {
    setForm((current) => {
      const values = current[field]
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]

      return { ...current, [field]: nextValues }
    })
  }

  async function handleImageUpload(event, field, bucket) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const url = await uploadProfileImage(file, bucket, userId)
      updateField(field, url)
      setMessage(`${field === 'profile_photo_url' ? 'Profile photo' : 'Cover image'} uploaded.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      user_id: userId,
      profile_type: form.profile_type,
      name: form.name.trim(),
      profile_photo_url: form.profile_photo_url || null,
      cover_image_url: form.cover_image_url || null,
      location: form.location.trim() || null,
      primary_category: form.primary_category || null,
      secondary_categories: form.secondary_categories,
      about_bio: form.about_bio.trim() || null,
      website: form.website.trim() || null,
      job_title_role: form.profile_type === 'individual' ? form.job_title_role.trim() || null : null,
      years_of_experience:
        form.profile_type === 'individual' && form.years_of_experience
          ? Number(form.years_of_experience)
          : null,
      skills_specialties:
        form.profile_type === 'individual' ? splitList(form.skills_specialties) : [],
      certifications:
        form.profile_type === 'individual' ? form.certifications.trim() || null : null,
      open_to_status: form.profile_type === 'individual' ? form.open_to_status : [],
      languages: form.profile_type === 'individual' ? splitList(form.languages) : [],
      business_type: form.profile_type === 'business' ? form.business_type.trim() || null : null,
      year_established:
        form.profile_type === 'business' && form.year_established
          ? Number(form.year_established)
          : null,
      team_size: form.profile_type === 'business' ? form.team_size.trim() || null : null,
      services_offered:
        form.profile_type === 'business' ? form.services_offered.trim() || null : null,
      opening_hours: form.profile_type === 'business' ? form.opening_hours.trim() || null : null,
    }

    try {
      await saveProfile(payload)
      setMessage('Profile saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="status-message">Loading your profile...</p>
  }

  const isIndividual = form.profile_type === 'individual'

  return (
    <section className="card profile-card">
      <div className="profile-card-header">
        <div>
          <h2>Your profile</h2>
          <p className="profile-subtitle">Signed in as {userEmail}</p>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Profile type</legend>
          <div className="segmented-control">
            <button
              type="button"
              className={isIndividual ? 'segment active' : 'segment'}
              onClick={() => updateField('profile_type', 'individual')}
            >
              Individual
            </button>
            <button
              type="button"
              className={!isIndividual ? 'segment active' : 'segment'}
              onClick={() => updateField('profile_type', 'business')}
            >
              Business
            </button>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Shared details</legend>

          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder={isIndividual ? 'Your full name' : 'Business name'}
              required
            />
          </label>

          <label>
            {isIndividual ? 'Profile photo' : 'Logo'}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageUpload(event, 'profile_photo_url', 'profile-photos')}
            />
            {form.profile_photo_url ? (
              <img src={form.profile_photo_url} alt="" className="image-preview square" />
            ) : null}
          </label>

          <label>
            Cover image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleImageUpload(event, 'cover_image_url', 'cover-images')}
            />
            {form.cover_image_url ? (
              <img src={form.cover_image_url} alt="" className="image-preview wide" />
            ) : null}
          </label>

          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="City, country (map pin coming later)"
            />
          </label>

          <label>
            Primary category
            <select
              value={form.primary_category}
              onChange={(event) => updateField('primary_category', event.target.value)}
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="field-group">
            <span className="field-label">Secondary categories</span>
            <div className="checkbox-grid">
              {CATEGORIES.map((category) => (
                <label key={category} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.secondary_categories.includes(category)}
                    onChange={() => toggleArrayValue('secondary_categories', category)}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          <label>
            About / bio
            <textarea
              rows={4}
              value={form.about_bio}
              onChange={(event) => updateField('about_bio', event.target.value)}
              placeholder="Tell people about yourself or your business"
            />
          </label>

          <label>
            Website
            <input
              type="url"
              value={form.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://"
            />
          </label>
        </fieldset>

        {isIndividual ? (
          <fieldset className="form-section">
            <legend>Individual details</legend>

            <label>
              Job title / role
              <input
                type="text"
                value={form.job_title_role}
                onChange={(event) => updateField('job_title_role', event.target.value)}
                placeholder="e.g. Head Roaster"
              />
            </label>

            <label>
              Years of experience
              <input
                type="number"
                min="0"
                value={form.years_of_experience}
                onChange={(event) => updateField('years_of_experience', event.target.value)}
                placeholder="e.g. 8"
              />
            </label>

            <label>
              Skills / specialties
              <textarea
                rows={3}
                value={form.skills_specialties}
                onChange={(event) => updateField('skills_specialties', event.target.value)}
                placeholder="Comma-separated, e.g. Sensory analysis, Sample roasting"
              />
            </label>

            <label>
              Certifications
              <textarea
                rows={3}
                value={form.certifications}
                onChange={(event) => updateField('certifications', event.target.value)}
                placeholder="List any certifications"
              />
            </label>

            <div className="field-group">
              <span className="field-label">Open to</span>
              <div className="checkbox-row">
                {OPEN_TO_OPTIONS.map((option) => (
                  <label key={option.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.open_to_status.includes(option.value)}
                      onChange={() => toggleArrayValue('open_to_status', option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <label>
              Languages
              <input
                type="text"
                value={form.languages}
                onChange={(event) => updateField('languages', event.target.value)}
                placeholder="Comma-separated, e.g. English, Spanish"
              />
            </label>
          </fieldset>
        ) : (
          <fieldset className="form-section">
            <legend>Business details</legend>

            <label>
              Business type
              <input
                type="text"
                value={form.business_type}
                onChange={(event) => updateField('business_type', event.target.value)}
                placeholder="e.g. Roastery, Café, Importer"
              />
            </label>

            <label>
              Year established
              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={form.year_established}
                onChange={(event) => updateField('year_established', event.target.value)}
                placeholder="e.g. 2016"
              />
            </label>

            <label>
              Team size
              <input
                type="text"
                value={form.team_size}
                onChange={(event) => updateField('team_size', event.target.value)}
                placeholder="e.g. 12 people"
              />
            </label>

            <label>
              Services offered
              <textarea
                rows={3}
                value={form.services_offered}
                onChange={(event) => updateField('services_offered', event.target.value)}
                placeholder="What does your business offer?"
              />
            </label>

            <label>
              Opening hours
              <textarea
                rows={3}
                value={form.opening_hours}
                onChange={(event) => updateField('opening_hours', event.target.value)}
                placeholder="e.g. Mon-Fri 8am-5pm"
              />
            </label>
          </fieldset>
        )}

        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {message ? <p className="status-message">{message}</p> : null}
    </section>
  )
}
