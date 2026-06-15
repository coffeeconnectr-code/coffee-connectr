import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { browseProfiles, browsePublicMapPins } from '../lib/browseApi'
import useMemberAccess from './useMemberAccess'
import { CATEGORIES } from '../lib/profileConstants'

export default function useMapProfiles(session) {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? ''
  const { hasAccess, loading: accessLoading } = useMemberAccess(session)
  const previewMode = !hasAccess

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(
    initialCategory && CATEGORIES.includes(initialCategory) ? initialCategory : '',
  )
  const [profileType, setProfileType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (accessLoading) {
      return undefined
    }

    let active = true

    async function loadResults() {
      setLoading(true)
      setError('')

      try {
        const profiles = previewMode
          ? await browsePublicMapPins({ category, profileType })
          : await browseProfiles({ search, category, profileType })

        if (active) {
          setResults(Array.isArray(profiles) ? profiles : [])
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

    const timeout = window.setTimeout(loadResults, previewMode ? 0 : 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [accessLoading, previewMode, search, category, profileType])

  return {
    search,
    setSearch,
    category,
    setCategory,
    profileType,
    setProfileType,
    results,
    loading: accessLoading || loading,
    error,
    previewMode,
  }
}
