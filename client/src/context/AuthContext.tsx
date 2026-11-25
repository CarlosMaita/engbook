import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getStoredToken, isDemoMode, setDemoMode, setStoredToken } from '../lib/api';
import { demoStore } from '../lib/demoData';
import { clearOfflineStore } from '../lib/offlineSync';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isDemo: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, dailyGoal: number) => Promise<void>;
  enterDemo: () => void;
  logout: () => Promise<void>;
  updateSettings: (data: { name?: string; dailyGoal?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      setDemoMode(true);
    }

    if (isDemoMode()) {
      setIsDemo(true);
      setUser(demoStore.getUser());
      setLoading(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setDemoMode(false);
    setIsDemo(false);
    const res = await api.login({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, dailyGoal: number) => {
      setDemoMode(false);
      setIsDemo(false);
      const res = await api.register({ name, email, password, dailyGoal });
      setStoredToken(res.token);
      setUser(res.user);
    },
    []
  );

  const enterDemo = useCallback(() => {
    setStoredToken(null);
    setDemoMode(true);
    setIsDemo(true);
    setUser(demoStore.getUser());
  }, []);

  const logout = useCallback(async () => {
    setDemoMode(false);
    setIsDemo(false);
    setStoredToken(null);
    setUser(null);
    await clearOfflineStore();
  }, []);

  const updateSettings = useCallback(async (data: { name?: string; dailyGoal?: number }) => {
    const res = await api.updateSettings(data);
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isDemo, loading, login, register, enterDemo, logout, updateSettings }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
