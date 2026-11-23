import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Loader.jsx';

const DEMO = [
  { label: 'Student', email: 'student@learnhub.com', password: 'student123' },
  { label: 'Instructor', email: 'riya@learnhub.com', password: 'instructor123' },
  { label: 'Admin', email: 'admin@learnhub.com', password: 'admin123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const doLogin = async (em, pw) => {
    setBusy(true);
    setError(null);
    try {
      const u = await login(em, pw);
      const from = location.state?.from;
      navigate(from && u.role === 'student' ? from : homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth card">
      <h1>Log in</h1>
      <ErrorBox error={error} />
      <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }} className="form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="btn btn-block" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>

      <div className="demo">
        <p className="muted">One-click demo login:</p>
        <div className="demo-buttons">
          {DEMO.map((d) => (
            <button key={d.label} className="btn btn-ghost btn-sm" disabled={busy} onClick={() => doLogin(d.email, d.password)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted center">No account? <Link to="/register">Sign up</Link></p>
    </div>
  );
}
