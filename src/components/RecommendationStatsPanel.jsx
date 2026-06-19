import { Link } from 'react-router-dom'
import {
  formatRecommendationProgress,
  formatRecommendationSummary,
} from '../lib/recommendationStats'

export default function RecommendationStatsPanel({ stats, compact = false }) {
  if (!stats) {
    return null
  }

  const summary = formatRecommendationSummary(stats)
  const progress = formatRecommendationProgress(stats)

  return (
    <section className={`recommendation-stats-panel${compact ? ' compact' : ''}`}>
      <div className="recommendation-stats-copy">
        <strong>{summary}</strong>
        <p className="status-message">{progress}</p>
      </div>
      {!compact ? (
        <Link to="/discover/recommend" className="secondary-button profile-action-link">
          Recommend someone
        </Link>
      ) : null}
    </section>
  )
}
