import { useEffect, useState } from 'react'
import { fetchMemberAccess } from '../lib/subscriptionApi'

const EMPTY_ACCESS = {
  hasAccess: false,
  isAdmin: false,
  status: 'anonymous',
  planType: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  daysRemaining: 0,
}

export default function useMemberAccess(session) {
  const [access, setAccess] = useState(EMPTY_ACCESS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadAccess() {
      if (!session?.user?.id) {
        if (active) {
          setAccess(EMPTY_ACCESS)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const result = await fetchMemberAccess()
        if (active) {
          setAccess(result)
        }
      } catch {
        if (active) {
          setAccess(EMPTY_ACCESS)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadAccess()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  return {
    access,
    hasAccess: access.hasAccess,
    loading,
  }
}
