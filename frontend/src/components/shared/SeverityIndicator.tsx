import { cn } from "../../lib/utils";

export type SeverityLevel = "HIGH" | "MEDIUM" | "LOW";

type SeverityIndicatorProps = {
  level: SeverityLevel;
  className?: string;
};

const levelStyles = {
  HIGH: "bg-[var(--foreground)] text-[var(--background)]",
  MEDIUM: "border border-[var(--border)] text-[var(--foreground)]",
  LOW: "border border-[var(--border)] text-[var(--muted)]"
} as const;

export function SeverityIndicator({ level, className }: SeverityIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest",
        levelStyles[level],
        className
      )}
      aria-label={`Severity ${level}`}
    >
      {level}
    </span>
  );
}
