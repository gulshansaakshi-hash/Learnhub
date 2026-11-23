import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Loader, { ErrorBox } from '../../components/Loader.jsx';

const EMPTY = { title: '', description: '', category: 'General', price: 0, thumbnail: '' };

export default function CourseForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/courses/${id}`)
      .then(({ course }) =>
        setForm({
          title: course.title,
          description: course.description,
          category: course.category,
          price: course.price,
          thumbnail: course.thumbnail || '',
        })
      )
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...form, price: Number(form.price) || 0 };
    try {
      const { course } = editing ? await api.put(`/courses/${id}`, body) : await api.post('/courses', body);
      navigate(`/instructor/courses/${course._id}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="narrow">
      <Link to={editing ? `/instructor/courses/${id}` : '/instructor'} className="muted small">← Back</Link>
      <h1>{editing ? 'Edit course' : 'Create a course'}</h1>
      {!editing && <p className="muted">New courses start as <strong>pending</strong> until an admin approves them.</p>}
      <ErrorBox error={error} />
      <form className="form card" onSubmit={submit}>
        <label>Title<input value={form.title} onChange={set('title')} required /></label>
        <label>Description<textarea rows={4} value={form.description} onChange={set('description')} required /></label>
        <div className="form-row">
          <label>Category<input value={form.category} onChange={set('category')} /></label>
          <label>Price (₹)<input type="number" min="0" value={form.price} onChange={set('price')} /></label>
        </div>
        <label>Thumbnail URL (optional)<input type="url" value={form.thumbnail} onChange={set('thumbnail')} placeholder="https://..." /></label>
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create course'}</button>
      </form>
    </div>
  );
}
