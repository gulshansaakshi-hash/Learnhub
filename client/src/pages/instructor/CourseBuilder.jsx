import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Loader, { ErrorBox } from '../../components/Loader.jsx';

const EMPTY_LESSON = { title: '', content: '', videoUrl: '', duration: '' };

function LessonForm({ initial = EMPTY_LESSON, onSave, onCancel, saveLabel = 'Add lesson' }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave({ ...form, duration: Number(form.duration) || 0 });
    setBusy(false);
    if (ok && saveLabel === 'Add lesson') setForm(EMPTY_LESSON);
  };

  return (
    <form className="form lesson-form" onSubmit={submit}>
      <input placeholder="Lesson title" value={form.title} onChange={set('title')} required />
      <textarea rows={4} placeholder="Lesson content" value={form.content} onChange={set('content')} />
      <div className="form-row">
        <input placeholder="Video URL (YouTube, optional)" value={form.videoUrl} onChange={set('videoUrl')} />
        <input type="number" min="0" placeholder="Minutes" value={form.duration} onChange={set('duration')} />
      </div>
      <div className="row-actions">
        <button className="btn btn-sm" disabled={busy}>{busy ? 'Saving...' : saveLabel}</button>
        {onCancel && <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function CourseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const home = useAuth().user?.role === 'admin' ? '/admin' : '/instructor';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [newModule, setNewModule] = useState('');
  const [renaming, setRenaming] = useState(null); // { id, title }
  const [addingTo, setAddingTo] = useState(null); // module id
  const [editing, setEditing] = useState(null); // { id, initial }

  const load = () => api.get(`/courses/${id}`).then(setData).catch(setError);
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Runs an action, shows errors, reloads the course; returns true on success.
  const run = async (fn, message) => {
    setError(null);
    setNotice('');
    try {
      await fn();
      await load();
      if (message) setNotice(message);
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  };

  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return <Loader />;
  const { course, quizzes, canManage } = data;
  if (!canManage) return <ErrorBox error="You can only manage your own courses." />;

  const addModule = (e) => {
    e.preventDefault();
    if (!newModule.trim()) return;
    run(() => api.post(`/courses/${id}/modules`, { title: newModule.trim() }), 'Module added').then(
      (ok) => ok && setNewModule('')
    );
  };

  const saveRename = (e) => {
    e.preventDefault();
    run(() => api.put(`/courses/${id}/modules/${renaming.id}`, { title: renaming.title }), 'Module renamed').then(
      (ok) => ok && setRenaming(null)
    );
  };

  const move = (index, dir) => {
    const mods = [...course.modules];
    const j = index + dir;
    if (j < 0 || j >= mods.length) return;
    [mods[index], mods[j]] = [mods[j], mods[index]];
    run(() =>
      Promise.all(mods.map((m, i) => api.put(`/courses/${id}/modules/${m._id}`, { order: i + 1 })))
    );
  };

  const deleteModule = (m) => {
    if (!window.confirm(`Delete module "${m.title}" and its ${m.lessons.length} lesson(s)?`)) return;
    run(() => api.del(`/courses/${id}/modules/${m._id}`), 'Module deleted');
  };

  const addLesson = (moduleId) => (lesson) =>
    run(() => api.post(`/courses/${id}/modules/${moduleId}/lessons`, lesson), 'Lesson added');

  const startEdit = async (lessonId) => {
    try {
      const { lesson } = await api.get(`/lessons/${lessonId}`);
      setEditing({
        id: lessonId,
        initial: { title: lesson.title, content: lesson.content || '', videoUrl: lesson.videoUrl || '', duration: lesson.duration || '' },
      });
    } catch (err) {
      setError(err);
    }
  };

  const saveLesson = (lesson) =>
    run(() => api.put(`/lessons/${editing.id}`, lesson), 'Lesson saved').then((ok) => {
      if (ok) setEditing(null);
      return ok;
    });

  const deleteLesson = (l) => {
    if (!window.confirm(`Delete lesson "${l.title}"?`)) return;
    run(() => api.del(`/lessons/${l._id}`), 'Lesson deleted');
  };

  const deleteQuiz = (q) => {
    if (!window.confirm(`Delete quiz "${q.title}" and all its attempts?`)) return;
    run(() => api.del(`/quizzes/${q._id}`), 'Quiz deleted');
  };

  const deleteCourse = async () => {
    if (!window.confirm(`Delete "${course.title}"? This also removes its lessons, quizzes, enrolments and attempts.`)) return;
    try {
      await api.del(`/courses/${id}`);
      navigate(home);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="builder">
      <Link to={home} className="muted small">← Dashboard</Link>
      <div className="page-head row">
        <div>
          <h1>{course.title} <span className={`badge badge-${course.status}`}>{course.status}</span></h1>
          <p className="muted">{course.modules.length} modules · {course.lessonCount} lessons · {quizzes.length} quizzes</p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-ghost btn-sm" to={`/courses/${id}`}>View page</Link>
          <Link className="btn btn-ghost btn-sm" to={`/learn/${id}`}>Preview</Link>
          <Link className="btn btn-ghost btn-sm" to={`/instructor/courses/${id}/edit`}>Edit details</Link>
          <button className="btn btn-danger btn-sm" onClick={deleteCourse}>Delete</button>
        </div>
      </div>
      {course.status === 'pending' && <div className="alert alert-info">This course is waiting for admin approval. Students can't see it yet.</div>}
      {course.status === 'blocked' && <div className="alert alert-error">An admin has blocked this course. It's hidden from students.</div>}
      <ErrorBox error={error} />
      {notice && <div className="alert alert-success">{notice}</div>}

      <h2>Modules & lessons</h2>
      {course.modules.length === 0 && <p className="empty">No modules yet. Add your first module below.</p>}
      {course.modules.map((m, i) => (
        <div key={m._id} className="card module">
          <div className="module-head">
            {renaming?.id === m._id ? (
              <form className="inline-form" onSubmit={saveRename}>
                <input value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} autoFocus required />
                <button className="btn btn-sm">Save</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRenaming(null)}>Cancel</button>
              </form>
            ) : (
              <h3>Module {i + 1}: {m.title}</h3>
            )}
            <div className="row-actions">
              <button className="btn btn-sm btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="btn btn-sm btn-ghost" onClick={() => move(i, 1)} disabled={i === course.modules.length - 1} aria-label="Move down">↓</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setRenaming({ id: m._id, title: m.title })}>Rename</button>
              <button className="btn btn-sm btn-danger" onClick={() => deleteModule(m)}>Delete</button>
            </div>
          </div>

          {m.lessons.length === 0 && <p className="muted">No lessons in this module yet.</p>}
          <ol className="lesson-list">
            {m.lessons.map((l) => (
              <li key={l._id}>
                {editing?.id === l._id ? (
                  <LessonForm initial={editing.initial} onSave={saveLesson} onCancel={() => setEditing(null)} saveLabel="Save lesson" />
                ) : (
                  <>
                    <span>{l.title}{l.duration ? <span className="muted"> · {l.duration} min</span> : null}</span>
                    <span className="row-actions">
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(l._id)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteLesson(l)}>Delete</button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>

          {addingTo === m._id ? (
            <LessonForm onSave={addLesson(m._id)} onCancel={() => setAddingTo(null)} />
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setAddingTo(m._id)}>+ Add lesson</button>
          )}
        </div>
      ))}

      <form className="card inline-form" onSubmit={addModule}>
        <input placeholder="New module title" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
        <button className="btn">+ Add module</button>
      </form>

      <div className="page-head row">
        <h2>Quizzes</h2>
        <Link className="btn btn-sm" to={`/instructor/courses/${id}/quiz/new`}>+ New quiz</Link>
      </div>
      {quizzes.length === 0 ? (
        <p className="empty">No quizzes yet.</p>
      ) : (
        <div className="card">
          <ul className="quiz-list">
            {quizzes.map((q) => (
              <li key={q._id}>
                <div>
                  <strong>{q.title}</strong>
                  <span className="muted"> · {q.questionCount} questions · pass {q.passMark}%</span>
                </div>
                <span className="row-actions">
                  <Link className="btn btn-sm btn-ghost" to={`/instructor/quiz/${q._id}`}>Edit</Link>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteQuiz(q)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
