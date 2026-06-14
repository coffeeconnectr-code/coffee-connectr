import { Link } from 'react-router-dom'
import useNoticeboardBrowse from '../hooks/useNoticeboardBrowse'
import NoticeboardBrowseMap from './NoticeboardBrowseMap'
import NoticeboardFilters from './NoticeboardFilters'

function postsWithLocation(posts) {
  return posts.filter((post) => post.latitude != null && post.longitude != null)
}

export default function NoticeboardMap() {
  const {
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
  } = useNoticeboardBrowse()

  const onMap = postsWithLocation(results)
  const missingLocation = results.length - onMap.length

  return (
    <section className="card discover-card noticeboard-page">
      <div className="discover-header">
        <div>
          <h2>Noticeboard map</h2>
          <p className="status-message">
            See where listings are located — equipment for sale, jobs, events, and more.
          </p>
        </div>
        <div className="discover-header-actions">
          <Link to="/noticeboard" className="secondary-button profile-action-link">
            List view
          </Link>
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
          {onMap.length} listing{onMap.length === 1 ? '' : 's'} on map
          {missingLocation > 0
            ? ` (${missingLocation} without a map location hidden)`
            : ''}
        </p>
      ) : null}

      {!loading && !error && onMap.length === 0 ? (
        <p className="status-message">
          No listings with a map location match those filters yet.
        </p>
      ) : null}

      {!loading && !error && onMap.length > 0 ? <NoticeboardBrowseMap posts={results} /> : null}
    </section>
  )
}
