import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Loader, { ErrorBox } from '../../components/Loader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

// Turns common YouTube/Vimeo links into embeddable URLs.
export function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname === 'vimeo.com') return `https://player.vimeo.com/video${u.pathname}`;
    return url;
  } catch {
    return '';
  }
}

export default function CoursePlayer() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [lessonError, setLessonError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then(setData).catch(setError);
  }, [courseId]);

  const flatLessons = useMemo(
    () => (data ? data.course.modules.flatMap((m) => m.lessons) : []),
    [data]
  );
  const currentId = params.get('lesson') || flatLessons[0]?._id;

  useEffect(() => {
    if (!currentId) return;
    setLesson(null);
    setLessonError(null);
    api.get(`/lessons/${currentId}`).then((d) => setLesson(d.lesson)).catch(setLessonError);
  }, [currentId]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loader />;

  const { course, enrollment, quizzes, canManage } = data;
  const isStudent = user.role === 'student';

  if (isStudent && !enrollment) {
    return (
      <div className="empty">
        <p>You need to enrol in this course first.</p>
        <Link className="btn" to={`/courses/${courseId}`}>View course</Link>
      </div>
    );
  }
  if (!isStudent && !canManage) {
    return <ErrorBox error="You can only preview courses you manage." />;
  }

  const completed = new Set(enrollment?.completedLessons || []);
  const index = flatLessons.findIndex((l) => l._id === currentId);
  const prev = flatLessons[index - 1];
  const next = flatLessons[index + 1];
  const isDone = completed.has(currentId);

  const go = (id) => {
    setParams({ lesson: id });
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const markComplete = async () => {
    setBusy(true);
    try {
      const d = await api.post(`/enrollments/${courseId}/complete/${currentId}`);
      setData({ ...data, enrollment: d.enrollment });
    } catch (err) {
      setLessonError(err);
    } finally {
      setBusy(false);
    }
  };

  const embed = toEmbedUrl(lesson?.videoUrl);

  return (
    <div className="player">
      <aside className={`player-side card ${menuOpen ? 'open' : ''}`}>
        <Link to={`/courses/${courseId}`} className="muted small">← Course page</Link>
        <h2 className="player-title">{course.title}</h2>
        {enrollment && <ProgressBar value={enrollment.progress} />}
        {course.modules.map((m, i) => (
          <div key={m._id} className="side-module">
            <h4>{i + 1}. {m.title}</h4>
            <ul>
              {m.lessons.map((l) => (
                <li key={l._id}>
                  <button className={`side-lesson ${l._id === currentId ? 'active' : ''}`} onClick={() => go(l._id)}>
                    <span className="check">{completed.has(l._id) ? '✓' : '○'}</span>
                    {l.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {quizzes.length > 0 && (
          <div className="side-module">
            <h4>Quizzes</h4>
            <ul>
              {quizzes.map((q) => (
                <li key={q._id}>
                  {isStudent ? (
                    <Link className="side-lesson" to={`/quiz/${q._id}`}>📝 {q.title}</Link>
                  ) : (
                    <span className="side-lesson">📝 {q.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section className="player-main">
        <button className="btn btn-ghost btn-sm player-menu" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? 'Hide lessons' : 'Show lessons'}
        </button>
        {flatLessons.length === 0 ? (
          <div className="empty">This course has no lessons yet.</div>
        ) : (
          <div className="card lesson">
            <ErrorBox error={lessonError} />
            {!lesson && !lessonError && <Loader text="Loading lesson..." />}
            {lesson && (
              <>
                <p className="muted small">Lesson {index + 1} of {flatLessons.length}{lesson.duration ? ` · ${lesson.duration} min` : ''}</p>
                <h1>{lesson.title}</h1>
                {embed && (
                  <div className="video">
                    <iframe src={embed} title={lesson.title} allowFullScreen
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                )}
                <div className="lesson-content">
                  {(lesson.content || 'No content yet.').split('\n').map((p, i) => (p ? <p key={i}>{p}</p> : null))}
                </div>
                <div className="lesson-actions">
                  <button className="btn btn-ghost" disabled={!prev} onClick={() => go(prev._id)}>← Previous</button>
                  {isStudent && (
                    <button className={`btn ${isDone ? 'btn-success' : ''}`} onClick={markComplete} disabled={busy || isDone}>
                      {isDone ? '✓ Completed' : busy ? 'Saving...' : 'Mark complete'}
                    </button>
                  )}
                  <button className="btn btn-ghost" disabled={!next} onClick={() => go(next._id)}>Next →</button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
