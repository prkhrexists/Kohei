import { useCallback, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { httpsCallable } from "firebase/functions";

import { db, storage, functions } from "../lib/firebase";

export type ColumnType = "FINANCIAL" | "DEMOGRAPHIC" | "DECISION" | "UNKNOWN";

export type ColumnClassification = {
  name: string;
  type: ColumnType;
  confidence: number;
};

type ParsedFile = {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
};

const FINANCIAL_KEYWORDS = [
  "income", "salary", "credit", "score", "debt",
  "dti", "loan", "amount", "ltv", "value", "employment", "asset",
];

const DEMOGRAPHIC_KEYWORDS = [
  "race", "ethnicity", "gender", "sex", "age",
  "birth", "zip", "postal", "address", "name", "surname",
];

const DECISION_KEYWORDS = ["approve", "deny", "decision", "outcome", "status", "result"];

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupeColumns(columns: string[]) {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const normalized = col.trim() || "column";
    const count = seen.get(normalized) ?? 0;
    seen.set(normalized, count + 1);
    return count === 0 ? normalized : `${normalized}_${count + 1}`;
  });
}

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<ColumnClassification[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ analysisId?: string } | null>(null);

  // ── File parsing ──────────────────────────────────────────────────────────
  const parseFile = useCallback(async (inputFile: File): Promise<ParsedFile> => {
    setError(null);
    if (inputFile.size === 0) throw new Error("File is empty");

    const extension = inputFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xlsx", "json"].includes(extension)) {
      throw new Error("Unsupported file type");
    }

    if (extension === "csv") {
      const text = await inputFile.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      const cols = dedupeColumns(parsed.meta.fields ?? []);
      const rows = parsed.data.map((row) => {
        const r: Record<string, unknown> = {};
        cols.forEach((c) => { r[c] = row[c as keyof typeof row] ?? null; });
        return r;
      });
      if (!cols.length) throw new Error("No columns detected in CSV file");
      return { rows, columns: cols, rowCount: rows.length };
    }

    if (extension === "xlsx") {
      const buf = await inputFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in workbook");
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: null });
      const cols = dedupeColumns(Object.keys(json[0] ?? {}));
      const rows = json.map((row) => {
        const r: Record<string, unknown> = {};
        cols.forEach((c) => { r[c] = row[c] ?? null; });
        return r;
      });
      if (!cols.length) throw new Error("No columns detected in Excel file");
      return { rows, columns: cols, rowCount: rows.length };
    }

    // JSON
    const text = await inputFile.text();
    let jsonData: Record<string, unknown>[] = [];
    try {
      const parsed = JSON.parse(text);
      jsonData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new Error("Invalid JSON format");
    }
    if (!jsonData.length) throw new Error("JSON file contains no rows");
    const cols = dedupeColumns(Object.keys(jsonData[0] ?? {}));
    const rows = jsonData.map((row) => {
      const r: Record<string, unknown> = {};
      cols.forEach((c) => { r[c] = row[c] ?? null; });
      return r;
    });
    if (!cols.length) throw new Error("No columns detected in JSON file");
    return { rows, columns: cols, rowCount: rows.length };
  }, []);

  // ── Column classification ─────────────────────────────────────────────────
  const classifyColumns = useCallback((columnNames: string[]) => {
    return columnNames.map((name) => {
      const n = normalizeName(name);
      const match = (kws: string[]) => kws.filter((k) => n.includes(k)).length;
      const fs = match(FINANCIAL_KEYWORDS);
      const ds = match(DEMOGRAPHIC_KEYWORDS);
      const dc = match(DECISION_KEYWORDS);
      const max = Math.max(fs, ds, dc);
      let type: ColumnType = "UNKNOWN";
      let confidence = 0.2;
      if (max > 0) {
        type = max === dc ? "DECISION" : max === ds ? "DEMOGRAPHIC" : "FINANCIAL";
        confidence = Math.min(0.95, 0.4 + max * 0.2);
      }
      return { name, type, confidence };
    });
  }, []);

  const updateColumnType = useCallback((name: string, type: ColumnType) => {
    setColumns((prev) => prev.map((col) => (col.name === name ? { ...col, type } : col)));
  }, []);

  // ── Local Python analysis server ──────────────────────────────────────────
  const runLocalAnalysis = useCallback(
    async (inputFile: File, classifications: ColumnClassification[]) => {
      const formData = new FormData();
      formData.append("file", inputFile);
      const colTypes: Record<string, string> = {};
      classifications.forEach((col) => { colTypes[col.name] = col.type; });
      formData.append("column_types", JSON.stringify(colTypes));

      let pct = 0;
      const timer = setInterval(() => {
        pct = Math.min(pct + 7, 85);
        setProgress(pct);
      }, 400);

      try {
        const res = await fetch("http://localhost:8787/analyze", {
          method: "POST",
          body: formData,
        });
        clearInterval(timer);
        setProgress(100);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Server error" }));
          throw new Error((err as { error: string }).error ?? "Analysis failed");
        }
        const data = await res.json() as { findings: unknown[]; overall_metrics: unknown };
        const analysisId = `local-${Date.now()}`;
        sessionStorage.setItem(`kohei_analysis_${analysisId}`, JSON.stringify(data));
        return { analysisId, findings: data.findings };
      } catch (err) {
        clearInterval(timer);
        throw err;
      }
    },
    []
  );

  // ── Demo simulation fallback ──────────────────────────────────────────────
  const simulateUpload = useCallback(async (): Promise<string> => {
    for (const pct of [5, 15, 28, 42, 57, 68, 79, 88, 95, 100]) {
      await new Promise((r) => setTimeout(r, 300));
      setProgress(pct);
    }
    return "demo-analysis-1";
  }, []);

  // ── Main upload function (local → Firebase → demo) ────────────────────────
  const uploadToFirebase = useCallback(
    async (inputFile: File, classifications: ColumnClassification[], bankId: string) => {
      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadResult(null);

      // 1. Try real local Python analysis server
      try {
        const { analysisId } = await runLocalAnalysis(inputFile, classifications);
        setUploadResult({ analysisId });
        setUploading(false);
        return analysisId;
      } catch (localErr) {
        const msg = localErr instanceof Error ? localErr.message : String(localErr);
        const serverDown = msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ERR_CONNECTION_REFUSED");
        if (!serverDown) {
          setError(`Analysis error: ${msg}`);
          setUploading(false);
          return null;
        }
        // Server not running — fall through to Firebase
      }

      // 2. Try Firebase upload + Cloud Function
      setProgress(0);
      try {
        const filePath = `banks/${bankId}/uploads/${Date.now()}_${inputFile.name}`;
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, inputFile);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            resolve
          );
        });
        const downloadUrl = await getDownloadURL(storageRef);
        const doc = await addDoc(collection(db, "banks", bankId, "analyses"), {
          createdAt: serverTimestamp(),
          datasetName: inputFile.name,
          status: "Queued",
          statusTone: "warning",
          fileUrl: downloadUrl,
          columnClassifications: classifications,
        });
        try {
          await httpsCallable(functions, "startBiasAnalysis")({ bankId, analysisId: doc.id, fileUrl: downloadUrl, columnClassifications: classifications });
          await updateDoc(doc, { status: "Processing" });
        } catch { /* non-fatal */ }
        setUploadResult({ analysisId: doc.id });
        setUploading(false);
        return doc.id;
      } catch {
        // 3. Full demo fallback
        const analysisId = await simulateUpload();
        setUploadResult({ analysisId });
        setUploading(false);
        return analysisId;
      }
    },
    [runLocalAnalysis, simulateUpload]
  );

  return {
    file, preview, columns, uploading, progress, error, uploadResult,
    setFile, setPreview, setColumns, setError,
    parseFile, classifyColumns, updateColumnType, uploadToFirebase,
  };
}
