import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "../components/shared/MetricCard";
import { PageHeader } from "../components/shared/PageHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Separator } from "../components/ui/separator";

// ── Static demo data — shown until real Firestore data arrives ───────────────
const DEMO_STATS = {
  totalAnalyses: 12,
  activeFindings: 3,
  reportsGenerated: 8,
  complianceScore: 76,
};

const DEMO_ANALYSES = [
  {
    id: "demo-analysis-1",
    createdAt: "Apr 24, 2026",
    datasetName: "Q1_loan_applications.csv",
    status: "Review Required",
    statusTone: "warning" as const,
    airScore: "0.71",
    findingsCount: 3,
  },
  {
    id: "demo-analysis-2",
    createdAt: "Apr 18, 2026",
    datasetName: "march_mortgage_data.csv",
    status: "Compliant",
    statusTone: "success" as const,
    airScore: "0.86",
    findingsCount: 1,
  },
  {
    id: "demo-analysis-3",
    createdAt: "Apr 10, 2026",
    datasetName: "personal_loans_batch_7.csv",
    status: "High Risk",
    statusTone: "danger" as const,
    airScore: "0.62",
    findingsCount: 5,
  },
  {
    id: "demo-analysis-4",
    createdAt: "Mar 29, 2026",
    datasetName: "auto_loan_Q1.csv",
    status: "Compliant",
    statusTone: "success" as const,
    airScore: "0.91",
    findingsCount: 0,
  },
];

export function DashboardPage() {
  const navigate = useNavigate();

  const overallScore = DEMO_STATS.complianceScore;
  const complianceTone =
    overallScore >= 85 ? "success" : overallScore >= 70 ? "warning" : "danger";

  const handleRowClick = (id: string) => {
    navigate(`/analysis/${id}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Fairness posture, recent analyses, and compliance signals."
        breadcrumbs={[{ label: "Kohei" }, { label: "Dashboard" }]}
        actions={
          <button
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--muted)]"
            type="button"
          >
            Last 30 days
          </button>
        }
      />

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Analyses Run"
          value={`${DEMO_STATS.totalAnalyses}`}
          trend="+2 this month"
          trendTone="positive"
        />
        <MetricCard
          label="Active Bias Findings"
          value={`${DEMO_STATS.activeFindings}`}
          trend="Requires review"
          trendTone="negative"
        />
        <MetricCard
          label="Reports Generated"
          value={`${DEMO_STATS.reportsGenerated}`}
          trend="3 pending sign-off"
          trendTone="neutral"
        />
        <MetricCard
          label="Overall Compliance Score"
          value={`${overallScore} / 100`}
          trend="Needs attention"
          trendTone={complianceTone === "success" ? "positive" : "negative"}
        />
      </section>

      {/* ── Recent Analyses ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent analyses</h3>
          <StatusBadge tone={complianceTone} label={`Compliance ${overallScore}`} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AIR Score</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_ANALYSES.map((analysis) => (
                  <TableRow
                    key={analysis.id}
                    className="cursor-pointer hover:bg-[var(--card)]"
                    onClick={() => handleRowClick(analysis.id)}
                  >
                    <TableCell className="text-[var(--muted)]">
                      {analysis.createdAt}
                    </TableCell>
                    <TableCell className="font-medium">
                      {analysis.datasetName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={analysis.statusTone}
                        label={analysis.status}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          parseFloat(analysis.airScore) < 0.8
                            ? "font-semibold text-[var(--danger)]"
                            : "font-semibold text-[var(--success)]"
                        }
                      >
                        {analysis.airScore}
                      </span>
                    </TableCell>
                    <TableCell>{analysis.findingsCount}</TableCell>
                    <TableCell>
                      <button className="text-sm text-[var(--primary)] hover:underline">
                        View →
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quick actions</h3>
          <p className="text-sm text-[var(--muted)]">
            Keep your compliance team ahead of audits.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/upload")}>Upload New Dataset</Button>
          <Button variant="secondary" onClick={() => navigate("/reports")}>
            View All Reports
          </Button>
        </div>
      </section>
    </div>
  );
}
