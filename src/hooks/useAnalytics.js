import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { flushAnalytics, setAnalyticsUser, trackPageView } from '../lib/analytics'

export default function useAnalytics(session) {
  const location = useLocation()
  const userId = session?.user?.id ?? null

  useEffect(() => {
    setAnalyticsUser(userId)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    trackPageView(location.pathname)

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flushAnalytics()
      }
    }

    function handlePageHide() {
      flushAnalytics()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      flushAnalytics()
    }
  }, [location.pathname, userId])
}
