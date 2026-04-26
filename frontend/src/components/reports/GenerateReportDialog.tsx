import { useState } from "react";
import { httpsCallable } from "firebase/functions";

import { functions } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type ReportConfig = {
  type: "Bias Research Report" | "Fix Strategy" | "Audit Package";
  sections: string[];
  signedBy: string;
};

type GenerateReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: string;
  userId: string;
  onGenerated?: (result: { reportId: string; downloadUrl: string; sha256Hash: string }) => void;
};

const sectionsList = [
  "Executive Summary",
  "Findings Detail",
  "Technical Methodology",
  "Remediation Strategy",
  "Audit Trail",
  "Appendices"
];

export function GenerateReportDialog({
  open,
  onOpenChange,
  analysisId,
  userId,
  onGenerated
}: GenerateReportDialogProps) {
  const [type, setType] = useState<ReportConfig["type"]>("Bias Research Report");
  const [sections, setSections] = useState<string[]>(sectionsList.slice(0, 3));
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setSections((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage("Compiling findings...");

    try {
      const generateFn = httpsCallable(functions, "generateReport");
      const result = await generateFn({
        analysisId,
        reportType: type,
        sections,
        signedBy: userId,
        signature
      });
      setStatusMessage("Generating PDF...");

      const payload = result.data as {
        reportId: string;
        downloadUrl: string;
        sha256Hash: string;
      };

      setStatusMessage("Signing...");
      onGenerated?.(payload);
      setStatusMessage("Report ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate report</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm text-[var(--muted)]">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em]">Report type</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ReportConfig["type"])}
              className="w-full rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option>Bias Research Report</option>
              <option>Fix Strategy</option>
              <option>Audit Package</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em]">Include sections</label>
            <div className="grid gap-2">
              {sectionsList.map((section) => (
                <label key={section} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sections.includes(section)}
                    onChange={() => toggleSection(section)}
                  />
                  {section}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em]">Compliance officer signature</label>
            <input
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)]"
              placeholder="Type full name"
            />
          </div>

          {statusMessage && <p>{statusMessage}</p>}
          {error && <p className="text-[var(--danger)]">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} disabled={loading || sections.length === 0}>
              {loading ? "Generating..." : "Generate report"}
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">Estimated time: 2-4 minutes.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
