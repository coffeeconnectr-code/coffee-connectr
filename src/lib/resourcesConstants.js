export const RESOURCE_TYPES = [
  { id: 'link', label: 'Online tool / link', icon: '🔗' },
  { id: 'document', label: 'Document upload', icon: '📄' },
]

export const RESOURCE_STATUS = {
  active: 'Active',
  archived: 'Archived',
}

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'ppt',
  'pptx',
  'zip',
]

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export function getResourceTypeLabel(postType) {
  return RESOURCE_TYPES.find((item) => item.id === postType)?.label ?? postType
}

export function getResourceTypeIcon(postType) {
  return RESOURCE_TYPES.find((item) => item.id === postType)?.icon ?? '📎'
}

export function formatResourceDate(value) {
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) {
    return null
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isAllowedDocument(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)
}

export function normalizeExternalUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}
