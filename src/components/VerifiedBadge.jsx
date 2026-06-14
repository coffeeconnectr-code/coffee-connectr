export default function VerifiedBadge({ compact = false }) {
  if (compact) {
    return (
      <span className="verified-badge verified-badge-compact" title="Verified member" aria-label="Verified member">
        ✓
      </span>
    )
  }

  return (
    <span className="verified-badge" title="Verified member">
      ✓ Verified
    </span>
  )
}
