import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { StatusBadge } from "../components/shared/StatusBadge";
import { GenerateReportDialog } from "../components/reports/GenerateReportDialog";

const mockReports = [
  {
    id: "rep-2024-08",
    date: "2026-04-20",
    analysisName: "Retail Loan Model",
    type: "Bias Research",
    status: "ready"
  },
  {
    id: "rep-2024-07",
    date: "2026-04-12",
    analysisName: "Mortgage Scoring",
    type: "Fix Strategy",
    status: "processing"
  }
];

const statusTone = {
  ready: "success",
  processing: "warning",
  archived: "neutral"
} as const;

export function ReportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);

  const filtered = useMemo(() => {
    return mockReports.filter((report) => {
      const matchesSearch = report.analysisName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, statusFilter, typeFilter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="Compliance-ready outputs from Kohei bias analyses."
        breadcrumbs={[{ label: "Kohei" }, { label: "Reports" }]}
        actions={<Button onClick={() => setOpenDialog(true)}>Generate New Report</Button>}
      />

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)] md:max-w-xs"
              placeholder="Search by analysis name"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="all">All Types</option>
              <option value="Bias Research">Bias Research</option>
              <option value="Fix Strategy">Fix Strategy</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Date</TableHead>
                <TableHead>Analysis Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <TableCell>{report.date}</TableCell>
                  <TableCell className="font-medium">{report.analysisName}</TableCell>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>
                    <StatusBadge tone={statusTone[report.status as keyof typeof statusTone]} label={report.status} />
                  </TableCell>
                  <TableCell>
                    <button className="text-sm text-[var(--primary)]">View</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        analysisId="analysis-001"
        userId="current-user"
      />
    </div>
  );
}
