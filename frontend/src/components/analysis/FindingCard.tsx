import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";

import { SeverityIndicator } from "../shared/SeverityIndicator";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Separator } from "../ui/separator";
import { cn } from "../../lib/utils";
import type { Finding } from "../../pages/AnalysisPage";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

type FindingCardProps = {
  finding: Finding;
  onAction: (status: Finding["status"], note?: string) => void;
  onNext: () => void;
  onPrevious: () => void;
};

const airTone = (score: number) => {
  if (score >= 0.8) return "text-[var(--success)]";
  if (score >= 0.7) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
};

export function FindingCard({ finding, onAction, onNext, onPrevious }: FindingCardProps) {
  const [showExplanation, setShowExplanation] = useState(true);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const chartData = useMemo(() => {
    const topFeatures = finding.topFeatures.slice(0, 5);
    return {
      labels: topFeatures.map((feature) => feature.name),
      datasets: [
        {
          label: "Importance",
          data: topFeatures.map((feature) => feature.importance),
          backgroundColor: "rgba(192, 98, 42, 0.8)",
          borderRadius: 8
        }
      ]
    };
  }, [finding.topFeatures]);

  useEffect(() => {
    cardRef.current?.focus();
  }, [finding.id]);

  return (
    <Card
      ref={cardRef}
      tabIndex={-1}
      className="relative w-full max-w-3xl border-[var(--border)] bg-[var(--card)]/95 shadow-kohei transition-all"
    >
      <CardContent className="space-y-6 p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <SeverityIndicator level={finding.severity} />
            <h2 className="text-2xl font-semibold capitalize">
              {finding.attribute}
            </h2>
            <p className="text-sm text-[var(--muted)]">~{finding.affectedCount} applicants impacted</p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[#221f1b] px-3 py-1 text-xs uppercase text-[var(--muted)]">
            Status: {finding.status}
          </span>
        </header>

        <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[#221f1b] p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">AIR Score</p>
            <p className={cn("mt-2 text-3xl font-semibold", airTone(finding.airScore))}>
              {finding.airScore.toFixed(2)}
            </p>
            <p className="text-xs text-[var(--muted)]">Regulatory threshold: 0.80</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Twin divergence</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {finding.twinDivergenceRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[var(--muted)]">Identical pairs diverged</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Confidence</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">High</p>
            <p className="text-xs text-[var(--muted)]">Based on 500+ pairs</p>
          </div>
        </section>

        <section className="space-y-4">
          <button
            onClick={() => setShowExplanation((prev) => !prev)}
            className="text-sm font-semibold text-[var(--primary)]"
          >
            {showExplanation ? "Hide" : "Show"} Gemini explanation
          </button>
          {showExplanation && finding.explanation && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[#221f1b] p-4 text-sm">
              <p className="font-semibold text-[var(--foreground)]">{finding.explanation.headline}</p>
              <p className="text-[var(--muted)]">{finding.explanation.what_it_means}</p>
              <p className="text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">Why it matters: </span>
                {finding.explanation.why_it_matters}
              </p>
              <p className="text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">Root cause: </span>
                {finding.explanation.root_cause}
              </p>
              <p className="text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">Recommended fix: </span>
                {finding.explanation.recommended_fix}
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Feature importance
          </h3>
          <div className="rounded-2xl border border-[var(--border)] bg-[#221f1b] p-4">
            <Bar
              data={chartData}
              options={{
                indexAxis: "y",
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: { ticks: { color: "#a09888" }, grid: { color: "#2f2923" } },
                  y: { ticks: { color: "#f0ebe2" }, grid: { display: false } }
                }
              }}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-wrap gap-3">
          <Button onClick={() => onAction("confirmed", note)} className="bg-[var(--success)] text-white">
            ✓ Confirm Finding
          </Button>
          <Button variant="secondary" onClick={() => onAction("dismissed", note)}>
            ✕ Dismiss
          </Button>
          <Button variant="outline" onClick={() => onAction("escalated", note)}>
            ⚠ Escalate to Legal
          </Button>
          <Button variant="ghost" onClick={() => setShowNote((prev) => !prev)}>
            📝 Add Note
          </Button>
        </section>

        {showNote && (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-[var(--border)] bg-[#221f1b] p-3 text-sm text-[var(--foreground)]"
            placeholder="Add a note for this finding"
          />
        )}

        <section className="flex items-center justify-between text-sm text-[var(--muted)]">
          <button onClick={onPrevious} className="text-[var(--primary)]">
            Previous
          </button>
          <button onClick={onNext} className="text-[var(--primary)]">
            Next
          </button>
        </section>
      </CardContent>
    </Card>
  );
}
