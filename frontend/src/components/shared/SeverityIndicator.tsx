import { cn } from "../../lib/utils";

export type SeverityLevel = "HIGH" | "MEDIUM" | "LOW";

type SeverityIndicatorProps = {
  level: SeverityLevel;
  className?: string;
};

const levelStyles = {
  HIGH: "bg-[var(--danger)] text-white",
  MEDIUM: "bg-[var(--warning)] text-[#2b1a07]",
  LOW: "bg-[var(--success)] text-white"
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
