import { CATEGORIES } from '../lib/profileConstants'

export default function BrowseFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  profileType,
  onProfileTypeChange,
  hideSearch = false,
}) {
  return (
    <div className="browse-filters">
      {hideSearch ? null : (
        <label>
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, location, or bio"
          />
        </label>
      )}

      <label>
        Category
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Profile type
        <select value={profileType} onChange={(event) => onProfileTypeChange(event.target.value)}>
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </select>
      </label>
    </div>
  )
}
