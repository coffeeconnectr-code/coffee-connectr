import { Link } from 'react-router-dom'

const DISCOVER_LINKS = [
  { to: '/discover', label: 'List view', key: 'browse' },
  { to: '/discover/map', label: 'Map view', key: 'map' },
  { to: '/discover/roasters', label: 'Find roasters', key: 'roasters' },
  { to: '/discover/recommend', label: 'Recommend Someone', key: 'recommend' },
]

export default function DiscoverNavLinks({ current = null, onRepeatCurrent = null }) {
  return (
    <div className="discover-header-actions">
      {DISCOVER_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={[
            'secondary-button',
            'profile-action-link',
            link.key === 'recommend' ? 'discover-nav-recommend' : '',
            link.key === current ? 'discover-nav-current' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={link.key === current ? 'page' : undefined}
          onClick={(event) => {
            if (link.key === current && onRepeatCurrent) {
              event.preventDefault()
              onRepeatCurrent(link.key)
            }
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
