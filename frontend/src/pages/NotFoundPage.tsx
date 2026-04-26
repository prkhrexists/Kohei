import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">We could not find that page.</p>
        <Button asChild className="mt-6">
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
