import { Link } from 'react-router-dom'

const DISCOVER_LINKS = [
  { to: '/discover', label: 'List view', key: 'browse' },
  { to: '/discover/map', label: 'Map view', key: 'map' },
  { to: '/discover/roasters', label: 'Find roasters', key: 'roasters' },
  { to: '/discover/recommend', label: 'Recommend Someone', key: 'recommend' },
]

export default function DiscoverNavLinks({ exclude = null }) {
  return (
    <div className="discover-header-actions">
      {DISCOVER_LINKS.filter((link) => link.key !== exclude).map((link) => (
        <Link key={link.to} to={link.to} className="secondary-button profile-action-link">
          {link.label}
        </Link>
      ))}
    </div>
  )
}
