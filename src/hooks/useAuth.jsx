import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  // true after an explicit logout, so the next sign-in starts at the dashboard, not the previous user's page
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password, remember) => {
    const res = await api.post('/auth/login', { email, password, device_name: 'admin-panel' });
    tokenStore.set(res.data.token, remember);
    setUser(res.data.user);
    setSignedOut(false);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // token may already be gone
    }
    tokenStore.clear();
    setSignedOut(true);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, ready, signedOut, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
