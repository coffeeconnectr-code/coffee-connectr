import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { browseProfiles } from '../lib/browseApi'

import { CATEGORIES } from '../lib/profileConstants'

function categoryFromSearchParams(searchParams) {
  const value = searchParams.get('category') ?? ''
  return value && CATEGORIES.includes(value) ? value : ''
}

function updateCategorySearchParam(searchParams, value) {
  const next = new URLSearchParams(searchParams)

  if (value && CATEGORIES.includes(value)) {
    next.set('category', value)
  } else {
    next.delete('category')
  }

  return next
}

export default function useBrowseProfiles() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = categoryFromSearchParams(searchParams)

  const [search, setSearch] = useState('')
  const [profileType, setProfileType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function setCategory(value) {
    setSearchParams(updateCategorySearchParam(searchParams, value), { replace: true })
  }

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
