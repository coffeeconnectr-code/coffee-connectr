export const CANONICAL_ORIGIN = 'https://www.coffeeconnectr.com'

export function buildShareUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${CANONICAL_ORIGIN}${normalizedPath}`
}
