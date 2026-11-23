import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = {
  guest: [{ to: '/', label: 'Courses' }],
  student: [
    { to: '/', label: 'Browse' },
    { to: '/my-courses', label: 'My Courses' },
  ],
  instructor: [
    { to: '/', label: 'Browse' },
    { to: '/instructor', label: 'Dashboard' },
    { to: '/instructor/courses/new', label: 'New Course' },
  ],
  admin: [
    { to: '/', label: 'Browse' },
    { to: '/admin', label: 'Courses' },
    { to: '/instructor/courses/new', label: 'New Course' },
    { to: '/admin/users', label: 'Users' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = LINKS[user?.role || 'guest'];

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">L</span> LearnHub
        </Link>
        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          ☰
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <span className="nav-user">
                {user.name} <span className={`badge badge-${user.role}`}>{user.role}</span>
              </span>
              <button className="btn btn-sm btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>Log in</NavLink>
              <Link to="/register" className="btn btn-sm" onClick={() => setOpen(false)}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
