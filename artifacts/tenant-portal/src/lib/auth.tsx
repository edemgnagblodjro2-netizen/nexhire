import { useState, createContext, useContext, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export const TENANT_TOKEN_KEY = "tenant_token";

// Register token getter for all custom-fetch calls
setAuthTokenGetter(() => localStorage.getItem(TENANT_TOKEN_KEY));

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem(TENANT_TOKEN_KEY)
  );

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TENANT_TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TENANT_TOKEN_KEY);
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        isAuthenticated: !!token,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
