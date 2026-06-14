import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { browseNoticeboardPosts } from '../lib/noticeboardApi'

export default function useNoticeboardBrowse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') ?? ''
  const category = searchParams.get('category') ?? ''

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  useEffect(() => {
    let active = true

    async function loadPosts() {
      setLoading(true)
      setError('')

      try {
        const posts = await browseNoticeboardPosts({ section, category, search, location })
        if (active) {
          setResults(posts)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message)
          setResults([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPosts()

    return () => {
      active = false
    }
  }, [section, category, search, location])

  return {
    section,
    category,
    search,
    location,
    results,
    loading,
    error,
    setSearch,
    setLocation,
    updateParam,
  }
}
