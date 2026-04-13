import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "./apiBase";

const AUTH_TOKEN_KEY = "auth_session_token";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  address: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, firstName: string, lastName: string, address?: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  loginWithEmail: async () => null,
  register: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/mobile-auth/email-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error || "Erreur de connexion.";
      }

      if (data.token && data.user) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        setUser(data.user);
      } else if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        await fetchUser();
      } else {
        return "Erreur de connexion. Veuillez réessayer.";
      }
      return null;
    } catch {
      return "Erreur réseau. Vérifiez votre connexion.";
    }
  }, [fetchUser]);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    address?: string,
  ): Promise<string | null> => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/mobile-auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName, address }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error || "Erreur lors de l'inscription.";
      }

      if (data.token && data.user) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        setUser(data.user);
      } else if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        await fetchUser();
      } else {
        return "Erreur lors de l'inscription. Veuillez réessayer.";
      }
      return null;
    } catch {
      return "Erreur réseau. Vérifiez votre connexion.";
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithEmail,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
