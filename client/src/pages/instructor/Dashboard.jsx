import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import Loader, { ErrorBox } from '../../components/Loader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

export function Stat({ label, value, hint }) {
  return (
    <div className="stat card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    Promise.all([api.get('/analytics/instructor'), api.get('/courses/mine')])
      .then(([a, c]) => {
        setAnalytics(a);
        setCourses(c.courses);
      })
      .catch(setError);
  };
  useEffect(load, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!analytics || !courses) return <Loader />;

  const { totals, perCourse, perQuiz } = analytics;

  return (
    <>
      <div className="page-head row">
        <h1>Instructor dashboard</h1>
        <Link className="btn" to="/instructor/courses/new">+ New course</Link>
      </div>

      <div className="stats">
        <Stat label="Courses" value={totals.courses} />
        <Stat label="Enrolments" value={totals.enrollments} />
        <Stat label="Quiz attempts" value={totals.attempts} />
        <Stat label="Avg quiz score" value={`${totals.avgQuizScore}%`} />
      </div>

      <h2>My courses</h2>
      {courses.length === 0 ? (
        <div className="empty">
          <p>No courses yet.</p>
          <Link className="btn" to="/instructor/courses/new">Create your first course</Link>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Course</th><th>Status</th><th>Modules</th><th>Lessons</th><th></th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/courses/${c._id}`}>{c.title}</Link></td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>{c.modules.length}</td>
                  <td>{c.lessonCount}</td>
                  <td className="right"><Link className="btn btn-sm" to={`/instructor/courses/${c._id}`}>Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Course analytics</h2>
      {perCourse.length === 0 ? (
        <p className="empty">No data yet.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Course</th><th>Enrolments</th><th>Avg progress</th><th>Attempts</th><th>Avg quiz score</th></tr></thead>
            <tbody>
              {perCourse.map((c) => (
                <tr key={c._id}>
                  <td>{c.title}</td>
                  <td>{c.enrollments}</td>
                  <td className="cell-progress"><ProgressBar value={c.avgProgress} /></td>
                  <td>{c.attempts}</td>
                  <td>{c.attempts ? `${c.avgQuizScore}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Quiz analytics</h2>
      {perQuiz.length === 0 ? (
        <p className="empty">No quiz attempts yet.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Quiz</th><th>Course</th><th>Attempts</th><th>Avg score</th><th>Pass rate</th></tr></thead>
            <tbody>
              {perQuiz.map((q) => (
                <tr key={q.quizId}>
                  <td>{q.quizTitle}</td>
                  <td>{q.courseTitle}</td>
                  <td>{q.attempts}</td>
                  <td>{q.avgScore}%</td>
                  <td>{q.passRate}% <span className="muted small">({q.passCount}/{q.attempts})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
