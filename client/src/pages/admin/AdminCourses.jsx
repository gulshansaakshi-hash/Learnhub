import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import Loader, { ErrorBox } from '../../components/Loader.jsx';
import { Stat } from '../instructor/Dashboard.jsx';

const TABS = ['', 'pending', 'approved', 'blocked'];

export default function AdminCourses() {
  const [status, setStatus] = useState('pending');
  const [courses, setCourses] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadStats = () => api.get('/admin/stats').then((d) => setStats(d.stats));
  const loadCourses = () =>
    api.get(`/admin/courses${status ? `?status=${status}` : ''}`).then((d) => setCourses(d.courses));

  useEffect(() => {
    setCourses(null);
    setError(null);
    Promise.all([loadStats(), loadCourses()]).catch(setError);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCourseStatus = async (course, next) => {
    setBusyId(course._id);
    setError(null);
    try {
      await api.patch(`/admin/courses/${course._id}/status`, { status: next });
      await Promise.all([loadStats(), loadCourses()]);
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-head row">
        <h1>Admin · Courses</h1>
        <Link className="btn btn-ghost" to="/admin/users">Manage users →</Link>
      </div>

      {stats && (
        <div className="stats">
          <Stat label="Users" value={stats.users.total} hint={`${stats.users.student} students · ${stats.users.instructor} instructors · ${stats.users.admin} admins`} />
          <Stat label="Courses" value={stats.courses.total} hint={`${stats.courses.approved} approved · ${stats.courses.pending} pending · ${stats.courses.blocked} blocked`} />
          <Stat label="Enrolments" value={stats.enrollments} />
          <Stat label="Quiz attempts" value={stats.attempts} />
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t || 'all'} role="tab" aria-selected={status === t} className={`tab ${status === t ? 'active' : ''}`} onClick={() => setStatus(t)}>
            {t ? t[0].toUpperCase() + t.slice(1) : 'All'}
            {stats && <span className="tab-count">{t ? stats.courses[t] : stats.courses.total}</span>}
          </button>
        ))}
      </div>

      <ErrorBox error={error} />
      {!courses ? (
        <Loader />
      ) : courses.length === 0 ? (
        <p className="empty">No {status || ''} courses.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Course</th><th>Instructor</th><th>Lessons</th><th>Status</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/courses/${c._id}`}>{c.title}</Link><div className="muted small">{c.category}</div></td>
                  <td>{c.instructor?.name}</td>
                  <td>{c.lessonCount}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td className="right row-actions">
                    {c.status !== 'approved' && (
                      <button className="btn btn-sm btn-success" disabled={busyId === c._id} onClick={() => setCourseStatus(c, 'approved')}>Approve</button>
                    )}
                    {c.status !== 'blocked' && (
                      <button className="btn btn-sm btn-danger" disabled={busyId === c._id} onClick={() => setCourseStatus(c, 'blocked')}>Block</button>
                    )}
                    {c.status !== 'pending' && (
                      <button className="btn btn-sm btn-ghost" disabled={busyId === c._id} onClick={() => setCourseStatus(c, 'pending')}>Reset</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
