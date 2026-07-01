import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const STORAGE_KEY = "auth_session_v2";

export type AuthRole = "user" | "admin";

export type AuthSession = {
  key: string;
  keyId: number;
  role: AuthRole;
  label: string;
  expiresAt: string | null;
  token: string; // HMAC-signed server session token
};

type AuthContextType = {
  session: AuthSession | null;
  loading: boolean;
  login: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  trackDownload: (count?: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  trackDownload: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved: AuthSession = JSON.parse(raw);
            // Check expiry
            if (saved.expiresAt && new Date(saved.expiresAt) < new Date()) {
              AsyncStorage.removeItem(STORAGE_KEY);
            } else {
              setSession(saved);
            }
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (key: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        return { success: false, error: data.error ?? "Invalid or expired key" };
      }
      const newSession: AuthSession = {
        key,
        keyId: data.keyId,
        role: data.role,
        label: data.label,
        expiresAt: data.expiresAt ?? null,
        token: data.token,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Network error. Check connection." };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const trackDownload = useCallback(async (count = 1) => {
    if (!session?.token) return;
    try {
      await fetch(`${API_BASE}/auth/track-download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`,
        },
        body: JSON.stringify({ count }),
      });
    } catch {}
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, trackDownload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
