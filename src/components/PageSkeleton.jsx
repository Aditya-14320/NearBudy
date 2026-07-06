import './PageSkeleton.css';

const PageSkeleton = () => (
  <div className="page-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-icon" />
    </div>
    <div className="skeleton-body">
      <div className="skeleton-block skeleton-card" />
      <div className="skeleton-block skeleton-card" />
      <div className="skeleton-block skeleton-card short" />
    </div>
  </div>
);

export default PageSkeleton;
