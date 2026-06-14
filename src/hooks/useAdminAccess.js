import { useEffect, useState } from 'react'
import { checkIsAdmin } from '../lib/adminApi'

export default function useAdminAccess(session) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadAdminStatus() {
      if (!session?.user?.id) {
        if (active) {
          setIsAdmin(false)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const allowed = await checkIsAdmin()
        if (active) {
          setIsAdmin(allowed)
        }
      } catch {
        if (active) {
          setIsAdmin(false)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadAdminStatus()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  return { isAdmin, loading }
}
