import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";

import { useFileUpload, type ColumnType } from "../hooks/useFileUpload";
import { PageHeader } from "../components/shared/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Progress } from "../components/ui/progress";
import { EmptyState } from "../components/shared/EmptyState";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { cn } from "../lib/utils";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const typeLabels: Record<ColumnType, string> = {
  FINANCIAL: "FINANCIAL",
  DEMOGRAPHIC: "DEMOGRAPHIC",
  DECISION: "DECISION",
  UNKNOWN: "UNKNOWN"
};

const typeColors: Record<ColumnType, string> = {
  FINANCIAL: "bg-blue-600 text-white",
  DEMOGRAPHIC: "bg-[var(--warning)] text-[#2b1a07]",
  DECISION: "bg-[var(--success)] text-white",
  UNKNOWN: "bg-[#2f2923] text-[var(--muted)]"
};

export function UploadPage() {
  const navigate = useNavigate();
  const [selectedBank] = useState("demo-bank");

  const {
    file,
    preview,
    columns,
    uploading,
    progress,
    error,
    uploadResult,
    setFile,
    setPreview,
    setColumns,
    setError,
    parseFile,
    classifyColumns,
    updateColumnType,
    uploadToFirebase
  } = useFileUpload();

  const [parsing, setParsing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const selected = acceptedFiles[0];
      if (!selected) return;
      if (selected.size > MAX_FILE_SIZE) {
        setError("File exceeds 100MB limit.");
        return;
      }
      setFile(selected);
      setParsing(true);
      try {
        const parsed = await parseFile(selected);
        setPreview(parsed.rows.slice(0, 10));
        const detected = classifyColumns(parsed.columns);
        setColumns(detected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setParsing(false);
      }
    },
    [classifyColumns, parseFile, setColumns, setError, setFile, setPreview]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open
  } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/json": [".json"]
    },
    maxFiles: 1,
    noClick: true
  });

  const decisionMissing = useMemo(
    () => !columns.some((col) => col.type === "DECISION"),
    [columns]
  );

  const demographicMissing = useMemo(
    () => !columns.some((col) => col.type === "DEMOGRAPHIC"),
    [columns]
  );

  const handleStartAnalysis = async () => {
    if (!file) return;
    const analysisId = await uploadToFirebase(file, columns, selectedBank);
    if (analysisId) {
      navigate(`/analysis/${analysisId}`);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setColumns([]);
    setError(null);
  };

  useEffect(() => {
    if (uploadResult?.analysisId) {
      navigate(`/analysis/${uploadResult.analysisId}`);
    }
  }, [navigate, uploadResult]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Upload Data"
        description="Upload loan decision files and classify columns for analysis."
        breadcrumbs={[{ label: "Kohei" }, { label: "Upload" }]}
      />

      <Card>
        <CardContent className="space-y-6 py-8">
          <div
            {...getRootProps()}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[#221f1b] px-6 py-12 text-center transition",
              isDragActive ? "border-[var(--primary)] bg-[#2c241d]" : ""
            )}
          >
            <input {...getInputProps()} />
            <p className="text-lg font-semibold">Drag and drop your dataset</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Accepted formats: CSV, XLSX, JSON. Max size 100MB.
            </p>
            <Button className="mt-4" onClick={open} type="button">
              Browse files
            </Button>
          </div>

          {parsing && (
            <div className="flex items-center justify-center">
              <LoadingSpinner label="Parsing file" />
            </div>
          )}

          {error && (
            <div
              className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {!file && !parsing && (
        <EmptyState
          title="No file selected"
          description="Upload a dataset to begin column detection and fairness analysis."
        />
      )}

      {file && preview && (
        <div className="space-y-8">
          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">File preview</h3>
                  <p className="text-sm text-[var(--muted)]">{file.name}</p>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Unknown type"}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(preview[0] ?? {}).map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.keys(row).map((col) => (
                        <TableCell key={col}>{String(row[col] ?? "-")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Detected columns</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {columns.map((col) => (
                  <button
                    key={col.name}
                    className={cn("rounded-full px-3 py-1 text-xs font-semibold", typeColors[col.type])}
                    onClick={() =>
                      updateColumnType(
                        col.name,
                        col.type === "FINANCIAL"
                          ? "DEMOGRAPHIC"
                          : col.type === "DEMOGRAPHIC"
                            ? "DECISION"
                            : col.type === "DECISION"
                              ? "UNKNOWN"
                              : "FINANCIAL"
                      )
                    }
                    aria-label={`Column ${col.name} classified as ${col.type}`}
                  >
                    {col.name} · {typeLabels[col.type]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-6">
              <h3 className="text-lg font-semibold">Classification review</h3>
              <div className="space-y-3">
                {columns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{col.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Confidence: {(col.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <select
                      value={col.type}
                      onChange={(event) => updateColumnType(col.name, event.target.value as ColumnType)}
                      className="rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--foreground)]"
                      aria-label={`Select type for ${col.name}`}
                    >
                      {Object.keys(typeLabels).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {decisionMissing && (
                <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/15 p-3 text-sm text-[var(--warning)]">
                  No DECISION column detected. Please select at least one decision field.
                </div>
              )}
              {demographicMissing && (
                <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/15 p-3 text-sm text-[var(--warning)]">
                  No DEMOGRAPHIC columns detected. Fairness analysis needs protected attributes.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleStartAnalysis}
                  disabled={uploading || decisionMissing}
                >
                  Start Analysis
                </Button>
                <Button variant="secondary" onClick={handleReset} disabled={uploading}>
                  Cancel
                </Button>
              </div>
              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-[var(--muted)]">Uploading... {progress}%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
