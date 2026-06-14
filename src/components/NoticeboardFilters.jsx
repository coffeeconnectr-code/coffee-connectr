import { CATEGORIES } from '../lib/profileConstants'
import { NOTICEBOARD_SECTIONS } from '../lib/noticeboardConstants'

export default function NoticeboardFilters({
  search,
  onSearchChange,
  section,
  onSectionChange,
  category,
  onCategoryChange,
  location,
  onLocationChange,
}) {
  return (
    <div className="browse-filters noticeboard-filters">
      <label>
        Search
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Title, description, or location"
        />
      </label>

      <label>
        Section
        <select value={section} onChange={(event) => onSectionChange(event.target.value)}>
          <option value="">All sections</option>
          <optgroup label="Core">
            {NOTICEBOARD_SECTIONS.filter((item) => item.group === 'core').map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="More">
            {NOTICEBOARD_SECTIONS.filter((item) => item.group === 'additions').map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

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
        Location
        <input
          type="text"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="City or region"
        />
      </label>
    </div>
  )
}
