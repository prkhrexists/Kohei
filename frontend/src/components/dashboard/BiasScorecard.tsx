import { useMemo, useState } from "react";

import { Card, CardContent } from "../ui/card";
import { StatusBadge } from "../shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "../../lib/utils";

export type RegulationCard = {
  regulation: "ECOA" | "Fair Housing Act" | "EU AI Act" | "CFPA";
  status: "compliant" | "at-risk" | "non-compliant";
  airScore: number;
  lastChecked: Date;
  keyMetric: string;
  details: string;
};

type BiasScorecardProps = {
  cards: RegulationCard[];
};

const statusTone = {
  compliant: "success",
  "at-risk": "warning",
  "non-compliant": "danger"
} as const;

export function BiasScorecard({ cards }: BiasScorecardProps) {
  const [activeCard, setActiveCard] = useState<RegulationCard | null>(null);

  const overall = useMemo(() => {
    if (!cards.length) return 0;
    const total = cards.reduce((sum, card) => sum + card.airScore, 0);
    return Math.round((total / cards.length) * 100);
  }, [cards]);

  const trend = overall >= 85 ? "improving" : overall >= 70 ? "stable" : "worsening";
  const trendIcon = trend === "improving" ? "↑" : trend === "stable" ? "→" : "↓";
  const gradient = `conic-gradient(#4caf7a ${overall * 3.6}deg, #2f2923 0deg)`;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Overall compliance</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-20 w-20">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: gradient }}
                  aria-hidden="true"
                />
                <div className="absolute inset-2 rounded-full bg-[var(--card)]" />
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
                  {overall}
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Compliance score</p>
                <p className="text-lg font-semibold">
                  {trendIcon} {trend}
                </p>
              </div>
            </div>
          </div>
          <div className="max-w-xs text-sm text-[var(--muted)]">
            Weighted across key regulations and protected group AIR thresholds.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.regulation}
            onClick={() => setActiveCard(card)}
            className="text-left"
            aria-label={`View ${card.regulation} compliance details`}
          >
            <Card className="h-full transition hover:border-[var(--primary)]">
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{card.regulation}</h3>
                  <StatusBadge tone={statusTone[card.status]} label={card.status} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">AIR score</p>
                  <p className="mt-2 text-3xl font-semibold">{card.airScore.toFixed(2)}</p>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  <p>{card.keyMetric}</p>
                  <p className="mt-2">Last checked: {Math.round((Date.now() - card.lastChecked.getTime()) / 86400000)} days ago</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={!!activeCard} onOpenChange={() => setActiveCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeCard?.regulation} compliance details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>{activeCard?.details}</p>
            {activeCard && (
              <div className="flex items-center gap-3">
                <StatusBadge tone={statusTone[activeCard.status]} label={activeCard.status} />
                <span className={cn("text-lg font-semibold", activeCard.airScore < 0.8 ? "text-[var(--warning)]" : "text-[var(--success)]")}>
                  AIR {activeCard.airScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
