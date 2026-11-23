import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Loader.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    setError(null);
    try {
      const u = await register(form.name, form.email, form.password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth card">
      <h1>Create a student account</h1>
      <ErrorBox error={error} />
      <form onSubmit={submit} className="form">
        <label>Name<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
        </label>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Creating account...' : 'Sign up'}</button>
      </form>
      <p className="muted center">Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
