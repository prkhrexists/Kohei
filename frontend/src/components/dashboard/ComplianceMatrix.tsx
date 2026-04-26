import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip
} from "chart.js";
import { saveAs } from "file-saver";

import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

export type ComplianceCell = {
  row: string;
  column: string;
  airScore: number;
};

type ComplianceMatrixProps = {
  rows: string[];
  columns: string[];
  data: ComplianceCell[];
  onSelect?: (cell: ComplianceCell) => void;
};

function scoreColor(score: number) {
  if (score >= 0.8) return "bg-[var(--success)]";
  if (score >= 0.7) return "bg-[var(--warning)]";
  return "bg-[var(--danger)]";
}

export function ComplianceMatrix({ rows, columns, data, onSelect }: ComplianceMatrixProps) {
  const matrix = useMemo(() => {
    const map = new Map<string, ComplianceCell>();
    data.forEach((cell) => map.set(`${cell.row}-${cell.column}`, cell));
    return map;
  }, [data]);

  const exportCsv = () => {
    const header = ["Row", "Column", "AIR Score"].join(",");
    const rowsCsv = data.map((cell) => `${cell.row},${cell.column},${cell.airScore.toFixed(2)}`);
    const blob = new Blob([header, ...rowsCsv].join("\n"), { type: "text/csv;charset=utf-8" });
    saveAs(blob, "compliance_matrix.csv");
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Compliance matrix</h3>
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
        </div>
        <div className="overflow-auto rounded-2xl border border-[var(--border)]">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[180px_repeat(auto-fit,minmax(140px,1fr))] bg-[#221f1b] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              <div className="px-4 py-3">Protected attribute</div>
              {columns.map((col) => (
                <div key={col} className="px-4 py-3 text-center">{col}</div>
              ))}
            </div>
            {rows.map((row) => (
              <div
                key={row}
                className="grid grid-cols-[180px_repeat(auto-fit,minmax(140px,1fr))] border-t border-[var(--border)]"
              >
                <div className="px-4 py-3 text-sm font-medium">{row}</div>
                {columns.map((col) => {
                  const cell = matrix.get(`${row}-${col}`);
                  return (
                    <button
                      key={col}
                      onClick={() => cell && onSelect?.(cell)}
                      className={cn(
                        "flex items-center justify-center px-4 py-3 text-sm text-white transition",
                        cell ? scoreColor(cell.airScore) : "bg-[#2f2923]"
                      )}
                    >
                      {cell ? cell.airScore.toFixed(2) : "--"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Darker colors indicate stronger adverse impact for the selected financial cluster.
        </p>
      </CardContent>
    </Card>
  );
}
