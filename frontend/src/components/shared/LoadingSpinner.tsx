import { cn } from "../../lib/utils";

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export function LoadingSpinner({ label = "Loading", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center gap-3 text-[var(--muted)]", className)}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
        <span className="absolute inset-2 rounded-full border-2 border-[var(--border)] border-b-[var(--primary)] animate-spin" />
      </div>
      <span className="text-sm uppercase tracking-[0.3em]">{label}</span>
    </div>
  );
}
