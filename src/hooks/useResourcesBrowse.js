import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { browseResourcePosts } from '../lib/resourcesApi'

export default function useResourcesBrowse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const postType = searchParams.get('type') ?? ''
  const topic = searchParams.get('topic') ?? ''

  const [search, setSearch] = useState('')
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

    async function loadResources() {
      setLoading(true)
      setError('')

      try {
        const resources = await browseResourcePosts({ postType, topic, search })
        if (active) {
          setResults(resources)
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

    loadResources()

    return () => {
      active = false
    }
  }, [postType, topic, search])

  return {
    postType,
    topic,
    search,
    results,
    loading,
    error,
    setSearch,
    updateParam,
  }
}
