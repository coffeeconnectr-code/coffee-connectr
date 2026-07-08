import { useEffect, useState } from 'react'
import {
  fetchAdminActivityEvents,
  fetchAdminAnalyticsSummary,
  fetchAdminMemberActivity,
} from '../../lib/adminApi'

const PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

function formatMinutes(totalSeconds) {
  const minutes = Math.max(0, Math.round(Number(totalSeconds ?? 0) / 60))

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [summary, setSummary] = useState(null)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAnalytics({
    nextDays = days,
    nextSearch = search,
    nextEventFilter = eventFilter,
  } = {}) {
    setLoading(true)
    setError('')

    try {
      const [summaryData, memberData, eventData] = await Promise.all([
        fetchAdminAnalyticsSummary(nextDays),
        fetchAdminMemberActivity(nextSearch, nextDays),
        fetchAdminActivityEvents({
          search: nextSearch,
          eventName: nextEventFilter,
          days: nextDays,
        }),
      ])

      setSummary(summaryData)
      setMembers(memberData)
      setEvents(eventData)
    } catch (loadError) {
      setError(loadError.message)
      setSummary(null)
      setMembers([])
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [days])

  async function handleSearch(event) {
    event.preventDefault()
    await loadAnalytics({ nextSearch: search, nextEventFilter: eventFilter })
  }

  return (
    <div className="admin-panel">
      <h3>Analytics</h3>
      <p className="status-message">
        Track member activity across the app, including page views, feature usage, and time on site.
      </p>

      <div className="admin-search-row">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search member email or name"
        />
        <input
          type="search"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
          placeholder="Filter events (e.g. message_send)"
        />
        <button type="button" className="secondary-button" onClick={handleSearch}>
          Apply filters
        </button>
      </div>

      {loading ? <p className="status-message">Loading analytics...</p> : null}
      {error ? <p className="status-message profile-error">{error}</p> : null}

      {summary ? (
        <>
          <div className="admin-stat-grid">
            <article className="admin-stat-card">
              <p className="admin-stat-value">{summary.activeMembers ?? 0}</p>
              <p className="admin-stat-label">Active members</p>
            </article>
            <article className="admin-stat-card">
              <p className="admin-stat-value">{summary.totalEvents ?? 0}</p>
              <p className="admin-stat-label">Tracked events</p>
            </article>
            <article className="admin-stat-card">
              <p className="admin-stat-value">{summary.totalMinutes ?? 0}</p>
              <p className="admin-stat-label">Minutes on site</p>
            </article>
          </div>

          <div className="admin-analytics-grid">
            <section>
              <h4 className="admin-subheading">Top pages</h4>
              <div className="admin-table">
                {(summary.topPages ?? []).map((row) => (
                  <article key={row.page_path} className="admin-row">
                    <div>
                      <strong>{row.page_path}</strong>
                      <p className="browse-meta">{row.count} views</p>
                    </div>
                  </article>
                ))}
              </div>
              {(summary.topPages ?? []).length === 0 ? (
                <p className="status-message">No page views recorded yet.</p>
              ) : null}
            </section>

            <section>
              <h4 className="admin-subheading">Feature usage</h4>
              <div className="admin-table">
                {(summary.featureUsage ?? []).map((row) => (
                  <article key={row.event_name} className="admin-row">
                    <div>
                      <strong>{row.event_name}</strong>
                      <p className="browse-meta">{row.count} events</p>
                    </div>
                  </article>
                ))}
              </div>
              {(summary.featureUsage ?? []).length === 0 ? (
                <p className="status-message">No feature events recorded yet.</p>
              ) : null}
            </section>
          </div>
        </>
      ) : null}

      <h4 className="admin-subheading">Member activity</h4>
      <div className="admin-table">
        {members.map((member) => (
          <article key={member.user_id} className="admin-row admin-row-stack">
            <div>
              <strong>{member.profile_name}</strong>
              <p className="browse-meta">{member.email}</p>
              <p className="browse-meta">
                {member.profile_type}
                {' · '}
                Last seen {formatDateTime(member.last_seen_at)}
              </p>
              <p className="browse-meta">
                {member.event_count} events
                {' · '}
                {formatMinutes(member.total_time_seconds)} on site
                {' · '}
                {member.session_count} session{member.session_count === 1 ? '' : 's'}
                {member.top_page ? ` · Top page ${member.top_page}` : ''}
              </p>
            </div>
          </article>
        ))}
      </div>
      {!loading && members.length === 0 ? (
        <p className="status-message">No member activity matches these filters.</p>
      ) : null}

      <h4 className="admin-subheading">Recent events</h4>
      <div className="admin-table">
        {events.map((event) => (
          <article key={event.id} className="admin-row admin-row-stack">
            <div>
              <strong>{event.event_name}</strong>
              <p className="browse-meta">
                {event.profile_name} ({event.email})
                {' · '}
                {formatDateTime(event.created_at)}
              </p>
              <p className="browse-meta">
                {event.page_path ? `Page ${event.page_path}` : 'No page'}
                {event.target_type ? ` · ${event.target_type}` : ''}
                {event.target_id ? ` · ${event.target_id}` : ''}
              </p>
              {event.properties && Object.keys(event.properties).length > 0 ? (
                <p className="browse-bio">{JSON.stringify(event.properties)}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!loading && events.length === 0 ? (
        <p className="status-message">No events match these filters.</p>
      ) : null}
    </div>
  )
}
