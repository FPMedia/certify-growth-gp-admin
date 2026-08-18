'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { apiFetch } from './api';
import { auth } from './firebase';

export type Role = 'USER' | 'CONTENT_MANAGER' | 'COMPANY_ADMIN' | 'SUPER_ADMIN';

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'CONTENT_MANAGER'];

export function isAdminRole(role: Role | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  company_id: number | null;
  team_id: number | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  refresh: noop,
  signIn: noop,
  resetPassword: noop,
  signOutUser: noop,
});

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<User>('/users/me');
      setUser(me);
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_AUTH) {
      void refresh();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        void refresh();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, signIn, resetPassword, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
