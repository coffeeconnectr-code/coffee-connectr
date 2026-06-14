export function getAuthRedirectUrl(path = '/dashboard') {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim()
  const origin =
    configuredOrigin && configuredOrigin.startsWith('http')
      ? configuredOrigin.replace(/\/$/, '')
      : window.location.origin

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalizedPath}`
}
