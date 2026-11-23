import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/api.js';

const AuthContext = createContext(null);

export const homeFor = (role) =>
  role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/my-courses';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api
      .get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {
        setToken(null);
        setTokenState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback(({ token: t, user: u }) => {
    setToken(t);
    setTokenState(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(
    async (email, password) => saveSession(await api.post('/auth/login', { email, password })),
    [saveSession]
  );
  const register = useCallback(
    async (name, email, password) => saveSession(await api.post('/auth/register', { name, email, password })),
    [saveSession]
  );
  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
