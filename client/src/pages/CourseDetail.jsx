import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPrice, Thumb } from '../components/CourseCard.jsx';
import Loader, { ErrorBox } from '../components/Loader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError(null);
    api.get(`/courses/${id}`).then(setData).catch(setError);
  };
  useEffect(load, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const enroll = async () => {
    if (!user) return navigate('/login', { state: { from: `/courses/${id}` } });
    setBusy(true);
    try {
      await api.post(`/enrollments/${id}`);
      navigate(`/learn/${id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loader />;

  const { course, quizzes, enrollment, canManage } = data;
  const completed = new Set(enrollment?.completedLessons || []);

  return (
    <div className="detail">
      <div className="detail-head card">
        <Thumb course={course} />
        <div className="detail-info">
          <span className="tag">{course.category}</span>
          {course.status !== 'approved' && <span className={`badge badge-${course.status}`}>{course.status}</span>}
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <p className="muted">
            By <strong>{course.instructor?.name}</strong> · {course.lessonCount} lessons · {course.modules.length} modules
          </p>
          <p className="price">{formatPrice(course.price)}</p>
          <ErrorBox error={data && error} />

          <div className="actions">
            {enrollment ? (
              <>
                <ProgressBar value={enrollment.progress} />
                <Link className="btn" to={`/learn/${id}`}>Continue learning</Link>
              </>
            ) : canManage ? (
              <>
                <Link className="btn" to={`/learn/${id}`}>Preview lessons</Link>
                {user?.role === 'instructor' && (
                  <Link className="btn btn-ghost" to={`/instructor/courses/${id}`}>Edit course</Link>
                )}
              </>
            ) : !user || user.role === 'student' ? (
              <button className="btn" onClick={enroll} disabled={busy || course.status !== 'approved'}>
                {busy ? 'Enrolling...' : user ? 'Enrol now' : 'Log in to enrol'}
              </button>
            ) : (
              <p className="muted">Only students can enrol in courses.</p>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2>Course outline</h2>
        {course.modules.length === 0 && <p className="empty">No modules yet.</p>}
        {course.modules.map((m, i) => (
          <div key={m._id} className="card module">
            <h3>Module {i + 1}: {m.title}</h3>
            {m.lessons.length === 0 ? (
              <p className="muted">No lessons yet.</p>
            ) : (
              <ol className="lesson-list">
                {m.lessons.map((l) => (
                  <li key={l._id}>
                    <span>{completed.has(l._id) ? '✅ ' : ''}{l.title}</span>
                    {l.duration > 0 && <span className="muted">{l.duration} min</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2>Quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="empty">No quizzes for this course yet.</p>
        ) : (
          <div className="card">
            <ul className="quiz-list">
              {quizzes.map((q) => (
                <li key={q._id}>
                  <div>
                    <strong>{q.title}</strong>
                    <span className="muted"> · {q.questionCount} questions · pass mark {q.passMark}%</span>
                  </div>
                  {enrollment && user?.role === 'student' && (
                    <Link className="btn btn-sm" to={`/quiz/${q._id}`}>Take quiz</Link>
                  )}
                  {canManage && user?.role === 'instructor' && (
                    <Link className="btn btn-sm btn-ghost" to={`/instructor/quiz/${q._id}`}>Edit</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
