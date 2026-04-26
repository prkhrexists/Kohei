import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../lib/firebase";
import { PageHeader } from "../components/shared/PageHeader";
import { EmptyState } from "../components/shared/EmptyState";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { FindingSidebar } from "../components/analysis/FindingSidebar";
import { ProgressTracker } from "../components/analysis/ProgressTracker";
import { FindingCard } from "../components/analysis/FindingCard";

export type GeminiExplanation = {
  headline: string;
  what_it_means: string;
  why_it_matters: string;
  root_cause: string;
  recommended_fix: string;
};

export type Finding = {
  id: string;
  attribute: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  airScore: number;
  twinDivergenceRate: number;
  affectedCount: number;
  topFeatures: { name: string; importance: number }[];
  explanation?: GeminiExplanation;
  status: "pending" | "confirmed" | "dismissed" | "escalated";
};

type AnalysisState = "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETE";

const mockFindings: Finding[] = [
  {
    id: "finding-1",
    attribute: "race: SC/ST applicants",
    severity: "HIGH",
    airScore: 0.74,
    twinDivergenceRate: 38,
    affectedCount: 142,
    topFeatures: [
      { name: "pin_code", importance: 0.34 },
      { name: "loan_amount", importance: 0.22 },
      { name: "cibil_score", importance: 0.18 },
      { name: "annual_income", importance: 0.12 },
      { name: "foir_ratio", importance: 0.08 }
    ],
    explanation: {
      headline: "Approval rates for SC/ST applicants fall below regulatory threshold",
      what_it_means:
        "Applicants with similar financial profiles are receiving different outcomes based on social category.",
      why_it_matters:
        "This may indicate disparate impact under fair lending guidelines and requires documented remediation.",
      root_cause: "Proxy variables such as PIN code and loan size are correlating with protected group.",
      recommended_fix:
        "Rebalance training data and introduce constraints to reduce proxy influence on approvals."
    },
    status: "pending"
  },
  {
    id: "finding-2",
    attribute: "gender: female applicants",
    severity: "MEDIUM",
    airScore: 0.89,
    twinDivergenceRate: 21,
    affectedCount: 96,
    topFeatures: [
      { name: "employment_years", importance: 0.28 },
      { name: "loan_to_value", importance: 0.2 },
      { name: "annual_income", importance: 0.17 },
      { name: "pin_code", importance: 0.12 },
      { name: "foir_ratio", importance: 0.1 }
    ],
    explanation: {
      headline: "Female applicants show modest approval disparity",
      what_it_means: "The model is slightly less favorable to female applicants with matched financials.",
      why_it_matters: "Continued drift could trigger compliance scrutiny during audits.",
      root_cause: "Historical underwriting patterns may be affecting model calibration.",
      recommended_fix: "Recalibrate thresholds and monitor monthly fairness drift for gender."
    },
    status: "pending"
  },
  {
    id: "finding-3",
    attribute: "age: 60+ applicants",
    severity: "LOW",
    airScore: 0.92,
    twinDivergenceRate: 14,
    affectedCount: 51,
    topFeatures: [
      { name: "employment_years", importance: 0.3 },
      { name: "loan_amount", importance: 0.2 },
      { name: "cibil_score", importance: 0.16 },
      { name: "foir_ratio", importance: 0.1 },
      { name: "loan_to_value", importance: 0.09 }
    ],
    explanation: {
      headline: "Senior applicants show minor disparity",
      what_it_means: "Most applicants are treated consistently, with minor divergence for seniors.",
      why_it_matters: "Low severity but should be logged for ongoing monitoring.",
      root_cause: "Slight differences in income verification policies.",
      recommended_fix: "Document current controls and monitor for drift."
    },
    status: "pending"
  }
];

export function AnalysisPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();

  // ── Load real findings from local server (stored by useFileUpload) ─────
  const realData = useMemo(() => {
    if (!analysisId) return null;
    const raw = sessionStorage.getItem(`kohei_analysis_${analysisId}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, [analysisId]);

  const initialFindings: Finding[] = useMemo(() => {
    if (realData?.findings?.length) {
      // Map server response to Finding type
      return (realData.findings as any[]).map((f: any) => ({
        id: f.id ?? f.attribute,
        attribute: f.attribute,
        severity: f.severity ?? "MEDIUM",
        airScore: f.airScore ?? f.air_score ?? 0,
        twinDivergenceRate: f.twinDivergenceRate ?? f.twin_divergence_rate ?? 0,
        affectedCount: f.affectedCount ?? f.affected_count ?? 0,
        topFeatures: f.topFeatures ?? f.top_features ?? [],
        status: "pending" as const,
        explanation: f.explanation ?? undefined,
      }));
    }
    return mockFindings;
  }, [realData]);

  const [state, setState] = useState<AnalysisState>("REVIEW_REQUIRED");
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [activeId, setActiveId] = useState<string>(initialFindings[0]?.id ?? "");

  const activeIndex = findings.findIndex((finding) => finding.id === activeId);
  const activeFinding = findings[activeIndex];

  const reviewedCounts = useMemo(() => {
    const confirmed = findings.filter((finding) => finding.status === "confirmed").length;
    const dismissed = findings.filter((finding) => finding.status === "dismissed").length;
    const escalated = findings.filter((finding) => finding.status === "escalated").length;
    return { confirmed, dismissed, escalated };
  }, [findings]);

  useEffect(() => {
    if (findings.every((finding) => finding.status !== "pending")) {
      setState("COMPLETE");
    } else if (state === "COMPLETE") {
      setState("REVIEW_REQUIRED");
    }
  }, [findings, state]);

  const handleAction = useCallback(
    async (status: Finding["status"], note?: string) => {
      if (!activeFinding) return;
      const updated = findings.map((finding) =>
        finding.id === activeFinding.id ? { ...finding, status } : finding
      );
      setFindings(updated);

      try {
        await updateDoc(doc(db, "findings", activeFinding.id), {
          status,
          reviewedBy: "current-user",
          reviewedAt: serverTimestamp(),
          verdict: status,
          notes: note ?? ""
        });
      } catch {
        // Firestore update optional for mock mode.
      }

      if (activeIndex < updated.length - 1) {
        setActiveId(updated[activeIndex + 1].id);
      }
    },
    [activeFinding, activeIndex, findings]
  );

  const handleNext = () => {
    if (activeIndex < findings.length - 1) {
      setActiveId(findings[activeIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveId(findings[activeIndex - 1].id);
    }
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!activeFinding) return;
      if (event.key === "Enter") handleAction("confirmed");
      if (event.key.toLowerCase() === "d") handleAction("dismissed");
      if (event.key.toLowerCase() === "e") handleAction("escalated");
      if (event.key.toLowerCase() === "n") handleNext();
      if (event.key.toLowerCase() === "p") handlePrevious();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeFinding, handleAction, handleNext, handlePrevious]);

  if (!analysisId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Analysis"
          description="Review identical twin matches and model diagnostics."
          breadcrumbs={[{ label: "Kohei" }, { label: "Analyses" }]}
        />
        <EmptyState
          title="No analysis loaded"
          description="Select a completed analysis or upload a new dataset to begin."
          actionLabel="Upload data"
          onAction={() => navigate("/upload")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bias anomaly review"
        description="Assess, confirm, or dismiss each flagged fairness anomaly."
        breadcrumbs={[{ label: "Kohei" }, { label: "Analyses" }, { label: analysisId }]} 
      />

      {state === "PROCESSING" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <LoadingSpinner label="Analyzing dataset" />
            <p className="text-sm text-[var(--muted)]">Running twin matching and bias diagnostics.</p>
            <ProgressTracker current={2} total={10} estimatedMinutes={8} />
          </CardContent>
        </Card>
      )}

      {state === "REVIEW_REQUIRED" && activeFinding && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FindingSidebar
            findings={findings}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
          />
          <div className="space-y-6">
            <ProgressTracker current={activeIndex + 1} total={findings.length} estimatedMinutes={12} />
            <FindingCard
              finding={activeFinding}
              onAction={handleAction}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>
        </div>
      )}

      {state === "COMPLETE" && (
        <Card>
          <CardContent className="space-y-6 py-10">
            <h2 className="text-2xl font-semibold">Review complete</h2>
            <p className="text-sm text-[var(--muted)]">
              {reviewedCounts.confirmed} confirmed, {reviewedCounts.dismissed} dismissed, {reviewedCounts.escalated} escalated.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/reports")}>Generate Report</Button>
              <Button variant="secondary" onClick={() => navigate("/reports")}>Create Fix Strategy</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
