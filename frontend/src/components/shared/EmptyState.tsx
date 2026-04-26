import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 h-16 w-16 rounded-full border border-[var(--border)] bg-[#221f1b]" />
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} aria-label={actionLabel}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
