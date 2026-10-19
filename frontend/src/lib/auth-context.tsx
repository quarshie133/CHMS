"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, AUTH_SESSION_EXPIRED, AUTH_TOKEN_REFRESHED, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Roles the backend treats as staff-or-above (IsStaffOrAbove). */
export const STAFF_ROLES = ["super_admin", "church_admin", "pastor", "staff"];
/** Roles the backend treats as admin-or-above (IsAdminOrAbove). */
export const ADMIN_ROLES = ["super_admin", "church_admin"];
/** Roles the backend treats as pastor-or-above (IsPastorOrAbove). */
export const PASTOR_ROLES = ["super_admin", "church_admin", "pastor"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    const finish = () => setLoading(false);
    if (storedToken) {
      authApi
        .me(storedToken)
        .then((me) => {
          setUser(me);
          // The request may have refreshed the token on the way.
          setToken(localStorage.getItem("access_token"));
        })
        .catch(clearSession)
        .finally(finish);
    } else {
      queueMicrotask(finish);
    }
  }, [clearSession]);

  // Keep React state in sync with token refreshes and expired sessions.
  useEffect(() => {
    const onRefreshed = (e: Event) => setToken((e as CustomEvent<string>).detail);
    const onExpired = () => clearSession();
    window.addEventListener(AUTH_TOKEN_REFRESHED, onRefreshed);
    window.addEventListener(AUTH_SESSION_EXPIRED, onExpired);
    return () => {
      window.removeEventListener(AUTH_TOKEN_REFRESHED, onRefreshed);
      window.removeEventListener(AUTH_SESSION_EXPIRED, onExpired);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setToken(data.access);
    const me = await authApi.me(data.access);
    setUser(me);
  }, []);

  const logout = clearSession;

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
    if (storedToken) {
      try {
        const me = await authApi.me(storedToken);
        setUser(me);
      } catch (e) {
        console.warn("Failed to refresh user profile", e);
      }
    }
  }, [token]);

  const hasRole = useCallback(
    (...roles: string[]) => (user ? roles.includes(user.role) : false),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
        isAuthenticated: !!token && !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
