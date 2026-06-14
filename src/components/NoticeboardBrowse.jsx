import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { browseNoticeboardPosts } from '../lib/noticeboardApi'
import NoticeboardCard from './NoticeboardCard'
import NoticeboardFilters from './NoticeboardFilters'

export default function NoticeboardBrowse({ currentUserId = null }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') ?? ''
  const category = searchParams.get('category') ?? ''

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <section className="card discover-card noticeboard-page">
      <div className="discover-header">
        <div>
          <h2>Noticeboard</h2>
          <p className="status-message">
            Classifieds, jobs, events, and industry listings from the community.
          </p>
        </div>
        <div className="discover-header-actions">
          {currentUserId ? (
            <Link to="/noticeboard/new" className="primary-button profile-action-link">
              Post listing
            </Link>
          ) : (
            <Link to="/sign-up" className="primary-button profile-action-link">
              Sign in to post
            </Link>
          )}
        </div>
      </div>

      <div className="noticeboard-section-pills">
        <button
          type="button"
          className={`noticeboard-pill${section === '' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('section', '')}
        >
          All
        </button>
        <button
          type="button"
          className={`noticeboard-pill${section === 'for_sale' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('section', 'for_sale')}
        >
          For Sale
        </button>
        <button
          type="button"
          className={`noticeboard-pill${section === 'jobs' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('section', 'jobs')}
        >
          Jobs
        </button>
        <button
          type="button"
          className={`noticeboard-pill${section === 'events' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('section', 'events')}
        >
          Events
        </button>
        <button
          type="button"
          className={`noticeboard-pill${section === 'wanted' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('section', 'wanted')}
        >
          Wanted
        </button>
      </div>

      <NoticeboardFilters
        search={search}
        onSearchChange={setSearch}
        section={section}
        onSectionChange={(value) => updateParam('section', value)}
        category={category}
        onCategoryChange={(value) => updateParam('category', value)}
        location={location}
        onLocationChange={setLocation}
      />

      {loading ? <p className="status-message">Loading listings...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error ? (
        <p className="status-message">
          {results.length} listing{results.length === 1 ? '' : 's'} found
        </p>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className="status-message">No listings match those filters yet.</p>
      ) : null}

      <div className="browse-grid">
        {results.map((post) => (
          <NoticeboardCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
