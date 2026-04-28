import { cn } from "../../lib/utils";
import type { Finding } from "../../pages/AnalysisPage";

type FindingSidebarProps = {
  findings: Finding[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

const severityDot = {
  HIGH: "bg-[var(--foreground)]",
  MEDIUM: "bg-[var(--muted)]",
  LOW: "bg-[#9ca3af]"
} as const;

const statusIcon = {
  pending: "●",
  confirmed: "✓",
  dismissed: "✕",
  escalated: "⚠"
} as const;

export function FindingSidebar({ findings, activeId, onSelect }: FindingSidebarProps) {
  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-72 flex-col gap-3 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:flex">
      <h3 className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Findings</h3>
      <div className="space-y-2">
        {findings.map((finding, index) => (
          <button
            key={finding.id}
            onClick={() => onSelect(finding.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
              activeId === finding.id
                ? "border-[var(--primary)] bg-[#f3f4f6]"
                : "border-transparent hover:bg-[#f3f4f6]"
            )}
            aria-label={`Finding ${index + 1} ${finding.attribute}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", severityDot[finding.severity])} />
                <span className="font-medium capitalize">{finding.attribute}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">AIR {finding.airScore.toFixed(2)}</p>
            </div>
            <span className="text-[var(--muted)]">{statusIcon[finding.status]}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
