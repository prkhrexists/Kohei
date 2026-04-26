import type { ReactNode } from "react";

import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
};

const trendToneMap = {
  positive: "text-[var(--success)]",
  negative: "text-[var(--danger)]",
  neutral: "text-[var(--muted)]"
};

export function MetricCard({ label, value, icon, trend, trendTone = "neutral" }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
          {trend && (
            <p className={cn("mt-2 text-sm", trendToneMap[trendTone])}>{trend}</p>
          )}
        </div>
        {icon && <div className="text-3xl text-[var(--primary)]">{icon}</div>}
      </CardContent>
    </Card>
  );
}
