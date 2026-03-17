import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = () => {
    return apiFetch('/api/auth/me')
      .then((res) => res.json().catch(() => ({ user: null })))
      .then((data) => {
        setUser(data?.user ?? null);
        return data?.user ?? null;
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const logout = () => {
    return apiFetch('/api/auth/logout', { method: 'POST' })
      .then(() => setUser(null))
      .catch(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
