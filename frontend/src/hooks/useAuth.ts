import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

import {
  AuthState,
  UserRole,
  observeAuthState,
  signInWithGoogle,
  signOut,
} from "../lib/auth";

// ── Demo mode helpers ─────────────────────────────────────────────────────────
const DEMO_KEY = "kohei_demo_mode";

export function activateDemoMode(): void {
  localStorage.setItem(DEMO_KEY, "true");
}

export function deactivateDemoMode(): void {
  localStorage.removeItem(DEMO_KEY);
}

function isDemoMode(): boolean {
  return (
    import.meta.env.VITE_DEMO_MODE === "true" ||
    localStorage.getItem(DEMO_KEY) === "true"
  );
}

function makeDemoUser(): User {
  return {
    uid: "demo-user-001",
    email: "demo@kohei.dev",
    displayName: "Demo Compliance Officer",
    photoURL: null,
    emailVerified: true,
    getIdToken: async () => "demo-token",
    getIdTokenResult: async () => ({ claims: { role: "compliance" } } as any),
  } as unknown as User;
}
// ─────────────────────────────────────────────────────────────────────────────

type AuthHookState = {
  user: User | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthHookState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Demo mode — skip Firebase Auth entirely
    if (isDemoMode()) {
      setUser(makeDemoUser());
      setRole("compliance");
      setLoading(false);
      return;
    }

    const unsubscribe = observeAuthState((state: AuthState) => {
      setUser(state.user);
      setRole(state.role);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    const wasDemo = isDemoMode();
    deactivateDemoMode();
    try {
      if (!wasDemo) await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setUser(null);
      setRole("unknown");
      setLoading(false);
    }
  }, []);

  return {
    user,
    role,
    loading,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
