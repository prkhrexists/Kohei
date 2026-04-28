import { Progress } from "../ui/progress";

type ProgressTrackerProps = {
  current: number;
  total: number;
  estimatedMinutes?: number;
};

export function ProgressTracker({ current, total, estimatedMinutes }: ProgressTrackerProps) {
  const progress = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[var(--muted)]">Reviewing finding {current} of {total}</p>
        {estimatedMinutes && (
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Est. {estimatedMinutes} min remaining
          </p>
        )}
      </div>
      <Progress value={progress} />
    </div>
  );
}
