import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Loader, { ErrorBox } from '../../components/Loader.jsx';

const ROLES = ['admin', 'instructor', 'student'];
const EMPTY = { name: '', email: '', password: '', role: 'instructor' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get(`/admin/users${role ? `?role=${role}` : ''}`).then((d) => setUsers(d.users)).catch(setError);

  useEffect(() => {
    setUsers(null);
    load();
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (u, patch, message) => {
    setError(null);
    setNotice('');
    try {
      await api.patch(`/admin/users/${u._id}`, patch);
      await load();
      setNotice(message);
    } catch (err) {
      setError(err);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const { user } = await api.post('/admin/users', form);
      setForm(EMPTY);
      await load();
      setNotice(`Created ${user.role} ${user.name}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head"><h1>Admin · Users</h1></div>

      <div className="card">
        <h2>Create a user</h2>
        <form className="form form-grid" onSubmit={create}>
          <input placeholder="Name" value={form.name} onChange={set('name')} required />
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input type="password" placeholder="Password (min 6)" minLength={6} value={form.password} onChange={set('password')} required />
          <select value={form.role} onChange={set('role')} aria-label="Role">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create'}</button>
        </form>
      </div>

      <div className="tabs" role="tablist">
        {['', ...ROLES].map((r) => (
          <button key={r || 'all'} role="tab" aria-selected={role === r} className={`tab ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
            {r ? `${r[0].toUpperCase()}${r.slice(1)}s` : 'All'}
          </button>
        ))}
      </div>

      <ErrorBox error={error} />
      {notice && <div className="alert alert-success">{notice}</div>}

      {!users ? (
        <Loader />
      ) : users.length === 0 ? (
        <p className="empty">No users found.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id}>
                    <td>{u.name}{self && <span className="muted small"> (you)</span>}</td>
                    <td className="break">{u.email}</td>
                    <td>
                      <select value={u.role} disabled={self} aria-label={`Role for ${u.name}`}
                        onChange={(e) => update(u, { role: e.target.value }, `${u.name} is now ${e.target.value}`)}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${u.isBlocked ? 'badge-blocked' : 'badge-approved'}`}>{u.isBlocked ? 'blocked' : 'active'}</span></td>
                    <td className="right">
                      {!self && (
                        <button className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                          onClick={() => update(u, { isBlocked: !u.isBlocked }, `${u.name} ${u.isBlocked ? 'unblocked' : 'blocked'}`)}>
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
