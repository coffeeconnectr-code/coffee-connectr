import { getCategoryIcon } from '../lib/profileConstants'

export default function CategoryLabel({ category, className = '' }) {
  return (
    <span className={`category-label ${className}`.trim()}>
      <span className="category-icon" aria-hidden="true">
        {getCategoryIcon(category)}
      </span>
      <span>{category}</span>
    </span>
  )
}
