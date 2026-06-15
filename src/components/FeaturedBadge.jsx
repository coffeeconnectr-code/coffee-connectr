export default function FeaturedBadge({ compact = false }) {
  if (compact) {
    return (
      <span
        className="featured-badge featured-badge-compact"
        title="Featured member"
        aria-label="Featured member"
      >
        ★
      </span>
    )
  }

  return (
    <span className="featured-badge" title="Featured member">
      ★ Featured
    </span>
  )
}
