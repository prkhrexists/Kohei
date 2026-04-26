import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Logo } from "../components/shared/Logo";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { Card, CardContent } from "../components/ui/card";
import { useAuth, activateDemoMode } from "../hooks/useAuth";

export function LoginPage() {
  const { signIn, loading, error, user } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    try {
      await signIn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign in failed");
    }
  };

  const handleDemoMode = () => {
    activateDemoMode();
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="kohei-gradient absolute inset-0 opacity-80" aria-hidden="true" />
      <div className="relative flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
          <CardContent className="space-y-6 p-10">
            <div className="space-y-4 text-center">
              <Logo size="lg" className="justify-center" />
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
                AI Fairness for Enterprise Banking
              </p>
              <h1 className="text-2xl font-semibold">Sign in to Kohei</h1>
              <p className="text-sm text-[var(--muted)]">
                Secure access for compliance teams overseeing AI lending decisions.
              </p>
            </div>

            <div className="space-y-3">
              {/* Google Sign-in */}
              <Button
                className="w-full transition-all duration-200"
                onClick={handleGoogleSignIn}
                disabled={loading}
                aria-label="Sign in with Google"
              >
                {loading ? "Signing in..." : "Sign in with Google"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted)]">or</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* Demo Mode — bypasses Firebase Auth completely */}
              <Button
                variant="outline"
                className="w-full border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--card)] transition-all duration-200"
                onClick={handleDemoMode}
                aria-label="Continue in Demo Mode"
              >
                🎯 Continue as Demo (no sign-in needed)
              </Button>

              {loading && (
                <div className="flex justify-center">
                  <LoadingSpinner label="Authenticating" />
                </div>
              )}

              {(error || localError) && (
                <div
                  className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]"
                  role="alert"
                >
                  {localError ?? error}
                </div>
              )}
            </div>

            <p className="text-center text-xs text-[var(--muted)]">
              By continuing, you agree to the Kohei data handling and compliance policies.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
