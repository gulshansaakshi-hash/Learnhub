import { Link } from 'react-router-dom';

const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed'];
const colourFor = (text = '') =>
  PALETTE[[...text].reduce((s, ch) => s + ch.charCodeAt(0), 0) % PALETTE.length];

export function Thumb({ course, small = false }) {
  if (course.thumbnail) {
    return <img className={`thumb ${small ? 'thumb-sm' : ''}`} src={course.thumbnail} alt="" loading="lazy" />;
  }
  return (
    <div className={`thumb thumb-placeholder ${small ? 'thumb-sm' : ''}`} style={{ background: colourFor(course.title) }}>
      <span>{course.title?.charAt(0) || '?'}</span>
    </div>
  );
}

export const formatPrice = (price) => (price > 0 ? `₹${price}` : 'Free');

export default function CourseCard({ course, children, to }) {
  return (
    <article className="card course-card">
      <Link to={to || `/courses/${course._id}`} className="course-card-link">
        <Thumb course={course} />
        <div className="course-card-body">
          <span className="tag">{course.category}</span>
          <h3>{course.title}</h3>
          <p className="muted clamp">{course.description}</p>
          <div className="course-meta">
            <span>{course.instructor?.name || ''}</span>
            <span>{course.lessonCount ?? 0} lessons</span>
            <strong>{formatPrice(course.price)}</strong>
          </div>
        </div>
      </Link>
      {children && <div className="course-card-footer">{children}</div>}
    </article>
  );
}
