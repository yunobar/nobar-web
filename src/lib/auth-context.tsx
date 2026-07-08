import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearCsrfToken, hasSession } from "@/lib/api-client";

interface AuthContextValue {
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Presence of the CSRF token (set on login) is our cold-start "has session" signal;
  // the real session is an HttpOnly cookie JS can't read.
  const [signedIn, setSignedIn] = useState(() => hasSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => {
        clearCsrfToken();
        setSignedIn(false);
      },
    }),
    [signedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
