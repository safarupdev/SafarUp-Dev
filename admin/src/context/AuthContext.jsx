/**
 * Admin authentication context.
 *
 * On mount, attempts to resolve the current session by calling
 * GET /auth/me (which relies on the httpOnly access-token cookie). This is
 * how a page refresh keeps an admin logged in without storing anything in
 * localStorage (PRD §30: tokens live only in httpOnly cookies, never in
 * client-readable storage).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminLogin as adminLoginApi, fetchCurrentUser, logout as logoutApi } from '../api/auth.api';
import { ADMIN_APP_ROLES } from '../constants/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const { user: currentUser } = await fetchCurrentUser();
      // Defensive check: even if a stale/foreign cookie somehow resolved to
      // a non-staff user, never treat that as an authenticated admin
      // session client-side. The backend already enforces this on every
      // protected route; this is a UI-level consistency guard, not the
      // real security boundary.
      if (currentUser && ADMIN_APP_ROLES.includes(currentUser.role)) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async ({ email, password }) => {
    const { user: loggedInUser } = await adminLoginApi({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refetchUser: loadSession,
    }),
    [user, isLoading, login, logout, loadSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
