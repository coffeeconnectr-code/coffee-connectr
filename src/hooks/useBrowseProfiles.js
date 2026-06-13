import { useEffect, useState } from 'react'
import { browseProfiles } from '../lib/browseApi'

export default function useBrowseProfiles() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [profileType, setProfileType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadResults() {
      setLoading(true)
      setError('')

      try {
        const profiles = await browseProfiles({ search, category, profileType })
        if (active) {
          setResults(profiles)
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

    const timeout = window.setTimeout(loadResults, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [search, category, profileType])

  return {
    search,
    setSearch,
    category,
    setCategory,
    profileType,
    setProfileType,
    results,
    loading,
    error,
  }
}
