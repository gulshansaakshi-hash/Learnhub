import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import CourseCard from '../../components/CourseCard.jsx';
import Loader, { ErrorBox } from '../../components/Loader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.get('/enrollments/me').then((d) => setEnrollments(d.enrollments)).catch(setError);
  };
  useEffect(load, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!enrollments) return <Loader />;

  const done = enrollments.filter((e) => e.progress === 100).length;

  return (
    <>
      <div className="page-head">
        <h1>My courses</h1>
        <p className="muted">{enrollments.length} enrolled · {done} completed</p>
      </div>
      {enrollments.length === 0 ? (
        <div className="empty">
          <p>You haven't enrolled in any courses yet.</p>
          <Link className="btn" to="/">Browse courses</Link>
        </div>
      ) : (
        <div className="grid">
          {enrollments.map((e) => (
            <CourseCard key={e._id} course={e.course} to={`/learn/${e.course._id}`}>
              <ProgressBar value={e.progress} />
              <Link className="btn btn-sm" to={`/learn/${e.course._id}`}>
                {e.progress === 0 ? 'Start' : e.progress === 100 ? 'Review' : 'Continue'}
              </Link>
            </CourseCard>
          ))}
        </div>
      )}
    </>
  );
}
