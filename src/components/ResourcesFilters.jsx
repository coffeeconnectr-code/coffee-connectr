import { CATEGORIES } from '../lib/profileConstants'

export default function ResourcesFilters({
  search,
  onSearchChange,
  postType,
  onPostTypeChange,
  topic,
  onTopicChange,
}) {
  return (
    <div className="browse-filters noticeboard-filters resources-filters">
      <label>
        Search
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Title, description, or filename"
        />
      </label>

      <label>
        Type
        <select value={postType} onChange={(event) => onPostTypeChange(event.target.value)}>
          <option value="">All types</option>
          <option value="link">Online tools & links</option>
          <option value="document">Documents</option>
        </select>
      </label>

      <label>
        Topic
        <select value={topic} onChange={(event) => onTopicChange(event.target.value)}>
          <option value="">All topics</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
