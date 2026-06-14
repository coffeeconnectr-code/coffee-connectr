import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../lib/profileConstants'
import {
  createResourcePost,
  fetchResourcePost,
  updateResourcePost,
  uploadResourceDocument,
} from '../lib/resourcesApi'
import {
  isAllowedDocument,
  MAX_DOCUMENT_BYTES,
  normalizeExternalUrl,
  RESOURCE_TYPES,
} from '../lib/resourcesConstants'

function emptyForm() {
  return {
    post_type: 'link',
    title: '',
    description: '',
    topic: '',
    external_url: '',
    document_url: '',
    file_name: '',
    file_size: null,
  }
}

export default function ResourceForm({ userId, resourceId = null }) {
  const navigate = useNavigate()
  const isEditing = resourceId != null

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

    async function loadResource() {
      setLoading(true)
      setError('')

      try {
        const resource = await fetchResourcePost(resourceId)

        if (!resource) {
          throw new Error('Resource not found')
        }

        if (resource.user_id !== userId) {
          throw new Error('You can only edit your own resources')
        }

        if (active) {
          setForm({
            post_type: resource.post_type,
            title: resource.title,
            description: resource.description,
            topic: resource.topic ?? '',
            external_url: resource.external_url ?? '',
            document_url: resource.document_url ?? '',
            file_name: resource.file_name ?? '',
            file_size: resource.file_size ?? null,
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

    loadResource()

    return () => {
      active = false
    }
  }, [isEditing, resourceId, userId])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleTypeChange(nextType) {
    setForm((current) => ({
      ...current,
      post_type: nextType,
      external_url: nextType === 'link' ? current.external_url : '',
      document_url: nextType === 'document' ? current.document_url : '',
      file_name: nextType === 'document' ? current.file_name : '',
      file_size: nextType === 'document' ? current.file_size : null,
    }))
  }

  async function handleDocumentUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isAllowedDocument(file)) {
      setError('That file type is not supported. Use PDF, Word, Excel, PowerPoint, CSV, TXT, or ZIP.')
      return
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('Documents must be 10 MB or smaller.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const url = await uploadResourceDocument(file, userId)
      setForm((current) => ({
        ...current,
        document_url: url,
        file_name: file.name,
        file_size: file.size,
      }))
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploading(false)
    }
  }

  function removeDocument() {
    setForm((current) => ({
      ...current,
      document_url: '',
      file_name: '',
      file_size: null,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (form.post_type === 'link' && !form.external_url.trim()) {
      setError('Add a link URL for online tools and resources.')
      setSaving(false)
      return
    }

    if (form.post_type === 'document' && !form.document_url) {
      setError('Upload a document before saving.')
      setSaving(false)
      return
    }

    const payload = {
      post_type: form.post_type,
      title: form.title,
      description: form.description,
      topic: form.topic,
      external_url: form.post_type === 'link' ? normalizeExternalUrl(form.external_url) : null,
      document_url: form.post_type === 'document' ? form.document_url : null,
      file_name: form.post_type === 'document' ? form.file_name : null,
      file_size: form.post_type === 'document' ? form.file_size : null,
    }

    try {
      if (isEditing) {
        await updateResourcePost(resourceId, payload)
        navigate(`/resources/${resourceId}`)
      } else {
        const created = await createResourcePost(userId, payload)
        navigate(`/resources/${created.id}`)
      }
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="status-message">Loading resource...</p>
  }

  return (
    <section className="card noticeboard-form-card resource-form-card">
      <div className="discover-header">
        <div>
          <h2>{isEditing ? 'Edit resource' : 'Share a tool or resource'}</h2>
          <p className="status-message">
            Post a link to an online tool, or upload a document such as a guide, template, or
            checklist.
          </p>
        </div>
        <Link to="/resources" className="secondary-button profile-action-link">
          Cancel
        </Link>
      </div>

      <form className="profile-form noticeboard-form resource-form" onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Resource type</legend>

          <div className="resource-type-options">
            {RESOURCE_TYPES.map((item) => (
              <label key={item.id} className="resource-type-option">
                <input
                  type="radio"
                  name="post_type"
                  value={item.id}
                  checked={form.post_type === item.id}
                  onChange={() => handleTypeChange(item.id)}
                />
                <span>
                  {item.icon} {item.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Details</legend>

          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="e.g. SCA cupping form, roast logging spreadsheet"
              required
              maxLength={120}
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="What is this resource, and how can members use it?"
              rows={6}
              required
            />
          </label>

          <label>
            Topic
            <select
              value={form.topic}
              onChange={(event) => updateField('topic', event.target.value)}
              required
            >
              <option value="">Choose a topic</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        {form.post_type === 'link' ? (
          <fieldset className="form-section">
            <legend>Link</legend>
            <label>
              URL
              <input
                type="url"
                value={form.external_url}
                onChange={(event) => updateField('external_url', event.target.value)}
                placeholder="https://example.com/tool"
                required
              />
            </label>
          </fieldset>
        ) : (
          <fieldset className="form-section">
            <legend>Document</legend>
            <p className="status-message">
              PDF, Word, Excel, PowerPoint, CSV, TXT, or ZIP up to 10 MB.
            </p>

            {form.document_url ? (
              <div className="resource-uploaded-file">
                <span>{form.file_name}</span>
                <button type="button" className="secondary-button" onClick={removeDocument}>
                  Remove
                </button>
              </div>
            ) : (
              <label className="resource-file-input">
                Upload document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip"
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                />
              </label>
            )}

            {uploading ? <p className="status-message">Uploading document...</p> : null}
          </fieldset>
        )}

        {error ? <p className="status-message profile-error">{error}</p> : null}

        <button type="submit" className="primary-button" disabled={saving || uploading}>
          {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Share resource'}
        </button>
      </form>
    </section>
  )
}
