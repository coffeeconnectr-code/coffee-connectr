import { Link } from 'react-router-dom'
import useResourcesBrowse from '../hooks/useResourcesBrowse'
import ResourceCard from './ResourceCard'
import ResourcesFilters from './ResourcesFilters'

export default function ResourcesBrowse({ currentUserId = null }) {
  const {
    postType,
    topic,
    search,
    results,
    loading,
    error,
    setSearch,
    updateParam,
  } = useResourcesBrowse()

  return (
    <section className="card discover-card resources-page">
      <div className="discover-header">
        <div>
          <h2>Tools & Resources</h2>
          <p className="status-message">
            Share useful links, apps, templates, and documents with the coffee community.
          </p>
        </div>
        <div className="discover-header-actions">
          {currentUserId ? (
            <Link to="/resources/new" className="primary-button profile-action-link">
              Share resource
            </Link>
          ) : (
            <Link to="/sign-up" className="primary-button profile-action-link">
              Sign in to share
            </Link>
          )}
        </div>
      </div>

      <div className="noticeboard-section-pills">
        <button
          type="button"
          className={`noticeboard-pill${postType === '' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('type', '')}
        >
          All
        </button>
        <button
          type="button"
          className={`noticeboard-pill${postType === 'link' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('type', 'link')}
        >
          Links & tools
        </button>
        <button
          type="button"
          className={`noticeboard-pill${postType === 'document' ? ' noticeboard-pill-active' : ''}`}
          onClick={() => updateParam('type', 'document')}
        >
          Documents
        </button>
      </div>

      <ResourcesFilters
        search={search}
        onSearchChange={setSearch}
        postType={postType}
        onPostTypeChange={(value) => updateParam('type', value)}
        topic={topic}
        onTopicChange={(value) => updateParam('topic', value)}
      />

      {loading ? <p className="status-message">Loading resources...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {!loading && !error ? (
        <p className="status-message">
          {results.length} resource{results.length === 1 ? '' : 's'} found
        </p>
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <p className="status-message">No resources match those filters yet.</p>
      ) : null}

      <div className="browse-grid">
        {results.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  )
}
