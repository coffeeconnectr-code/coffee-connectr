export default function ProfileSkeleton() {
  return (
    <article className="profile-view">
      <div className="profile-cover skeleton-block" />
      <div className="card profile-view-body">
        <div className="profile-view-top">
          <div className="profile-avatar skeleton-circle" />
          <div className="profile-skeleton-copy">
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
          </div>
        </div>
        <div className="skeleton-line" />
        <div className="skeleton-line medium" />
        <div className="skeleton-map" />
      </div>
    </article>
  )
}
