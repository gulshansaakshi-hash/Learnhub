import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty">
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <Link className="btn" to="/">Back to courses</Link>
    </div>
  );
}
