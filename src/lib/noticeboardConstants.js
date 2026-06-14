export const NOTICEBOARD_SECTIONS = [
  { id: 'listings', label: 'Listings', group: 'core' },
  { id: 'for_sale', label: 'For Sale', group: 'core' },
  { id: 'jobs', label: 'Jobs', group: 'core' },
  { id: 'news', label: 'News', group: 'core' },
  { id: 'events', label: 'Events', group: 'core' },
  { id: 'green_coffee', label: 'Green Coffee Offers', group: 'additions' },
  { id: 'wanted', label: 'Wanted / Seeking', group: 'additions' },
  { id: 'wholesale', label: 'Wholesale / Clearance', group: 'additions' },
  { id: 'premises', label: 'Premises / Business', group: 'additions' },
  { id: 'collaborations', label: 'Collaborations', group: 'additions' },
  { id: 'services', label: 'Services / Gigs', group: 'additions' },
]

export const NOTICEBOARD_STATUS = {
  active: 'Active',
  sold: 'Sold',
  filled: 'Filled',
  expired: 'Expired',
}

export const DEFAULT_LISTING_DAYS = 30

export const PRICE_SECTIONS = new Set([
  'for_sale',
  'green_coffee',
  'wholesale',
  'premises',
  'services',
  'wanted',
])

export function getSectionLabel(sectionId) {
  return NOTICEBOARD_SECTIONS.find((section) => section.id === sectionId)?.label ?? sectionId
}

export function formatPostPrice(post) {
  if (post.price_label?.trim()) {
    return post.price_label.trim()
  }

  if (post.price_amount == null) {
    return null
  }

  const amount = Number(post.price_amount)
  if (Number.isNaN(amount)) {
    return null
  }

  const currency = post.price_currency?.trim() || 'USD'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPostDate(value) {
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
