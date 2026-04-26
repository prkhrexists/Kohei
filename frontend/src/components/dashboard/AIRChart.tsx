import { useMemo, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  LineElement,
  PointElement
} from "chart.js";
import { saveAs } from "file-saver";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, LineElement, PointElement);

export type AIRData = {
  group: string;
  airScore: number;
  affectedCount: number;
  comparisonGroup: string;
};

type AIRChartProps = {
  data: AIRData[];
  title?: string;
};

export function AIRChart({ data, title = "Adverse Impact Ratio" }: AIRChartProps) {
  const chartRef = useRef<Chart<"bar"> | null>(null);
  const labels = data.map((item) => item.group);
  const colors = data.map((item) =>
    item.airScore >= 0.8 ? "#4caf7a" : item.airScore >= 0.7 ? "#e8a02a" : "#d45a4a"
  );

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "AIR Score",
          data: data.map((item) => item.airScore),
          backgroundColor: colors,
          borderRadius: 10
        }
      ]
    }),
    [data, labels, colors]
  );

  const downloadCsv = () => {
    const rows = ["Group,AIR Score,Affected Count,Comparison"].concat(
      data.map(
        (item) =>
          `${item.group},${item.airScore.toFixed(2)},${item.affectedCount},${item.comparisonGroup}`
      )
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "air_scores.csv");
  };

  const downloadPng = () => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.canvas.toBlob((blob) => {
      if (blob) saveAs(blob, "air_chart.png");
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadCsv}>Export CSV</Button>
            <Button variant="secondary" onClick={downloadPng}>Export PNG</Button>
          </div>
        </div>
        <Bar
          ref={chartRef}
          data={chartData}
          options={{
            indexAxis: "y",
            scales: {
              x: {
                min: 0,
                max: 1,
                grid: { color: "#2f2923" },
                ticks: { color: "#a09888" },
                title: { display: true, text: "AIR Score", color: "#a09888" }
              },
              y: {
                ticks: { color: "#f0ebe2" },
                grid: { display: false }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const item = data[ctx.dataIndex];
                    return `${item.airScore.toFixed(2)} | ${item.affectedCount} affected | ${item.comparisonGroup}`;
                  }
                }
              }
            }
          }}
          plugins={[
            {
              id: "thresholdLine",
              afterDraw: (chart) => {
                const { ctx, chartArea, scales } = chart;
                const x = scales.x.getPixelForValue(0.8);
                ctx.save();
                ctx.strokeStyle = "#e8a02a";
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();
                ctx.restore();
              }
            }
          ]}
        />
        <p className="text-xs text-[var(--muted)]">Regulatory threshold shown at 0.80.</p>
      </CardContent>
    </Card>
  );
}
