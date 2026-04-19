import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "./apiBase";

const AUTH_TOKEN_KEY = "auth_session_token";

export type UserRole = "user" | "organisme";

export interface OrganisationInfo {
  organisationName: string;
  organisationCity?: string;
  organisationPhone?: string;
  organisationWebsite?: string;
  plan?: "standard" | "plus";
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  address: string | null;
  role?: UserRole;
  isPremium?: boolean;
}

export interface RegisterResult {
  error?: string;
  organisationId?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    address?: string,
    role?: UserRole,
    org?: OrganisationInfo,
  ) => Promise<RegisterResult>;
  updateProfile: (data: { address?: string | null }) => Promise<string | null>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  updateProfile: async () => null,
  isAuthenticated: false,
  loginWithEmail: async () => null,
  register: async () => ({ error: undefined }),
  logout: async () => {},
  getToken: async () => null,
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
    role: UserRole = "user",
    org?: OrganisationInfo,
  ): Promise<RegisterResult> => {
    try {
      const apiBase = getApiBaseUrl();
      const body: Record<string, unknown> = { email, password, firstName, lastName, address, role };
      if (role === "organisme" && org) {
        body.organisationName = org.organisationName;
        body.organisationCity = org.organisationCity;
        body.organisationPhone = org.organisationPhone;
        body.organisationWebsite = org.organisationWebsite;
        body.plan = org.plan ?? "standard";
      }

      const res = await fetch(`${apiBase}/api/mobile-auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || "Erreur lors de l'inscription." };
      }

      if (data.token && data.user) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        setUser(data.user);
      } else if (data.token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
        await fetchUser();
      } else {
        return { error: "Erreur lors de l'inscription. Veuillez réessayer." };
      }
      return { organisationId: data.organisationId ?? null };
    } catch {
      return { error: "Erreur réseau. Vérifiez votre connexion." };
    }
  }, [fetchUser]);

  const updateProfile = useCallback(async (data: { address?: string | null }): Promise<string | null> => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) return "Non authentifié.";
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/mobile-auth/update-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return json.error || "Erreur lors de la mise à jour.";
      if (json.user) {
        setUser(json.user);
      } else {
        setUser((prev) => prev ? { ...prev, ...data } : prev);
      }
      return null;
    } catch {
      return "Erreur réseau. Vérifiez votre connexion.";
    }
  }, []);

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

  const getToken = useCallback(async (): Promise<string | null> => {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithEmail,
        register,
        updateProfile,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
