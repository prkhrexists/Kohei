import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { execSync } from "child_process";
import { GeminiExplainer } from "./analysis/gemini_explainer";

admin.initializeApp();

type AnalysisResult = {
  findings: Array<Record<string, any>>;
  [key: string]: any;
};

const db = admin.firestore();
const rtdb = admin.database();

function logInfo(message: string, meta: Record<string, any> = {}) {
  console.log(JSON.stringify({ severity: "INFO", message, ...meta }));
}

function logError(message: string, meta: Record<string, any> = {}) {
  console.error(JSON.stringify({ severity: "ERROR", message, ...meta }));
}

async function updateProgress(bankId: string, uploadId: string, stage: string, progress: number) {
  await rtdb.ref(`progress/${bankId}/${uploadId}`).set({ stage, progress, updatedAt: Date.now() });
}

async function runBiasAnalysis(
  filePath: string,
  columnClassifications: any,
  bankId: string,
  uploadId: string
): Promise<AnalysisResult> {
  const command = `python3 analysis/run_analysis.py ${filePath} '${JSON.stringify(
    columnClassifications
  )}' ${bankId} ${uploadId}`;
  const result = execSync(command, { cwd: __dirname });
  return JSON.parse(result.toString());
}

async function generateExplanations(analysisId: string, bankId: string) {
  const findingsSnapshot = await db
    .collection("banks")
    .doc(bankId)
    .collection("analyses")
    .doc(analysisId)
    .collection("findings")
    .get();

  const gemini = new GeminiExplainer(functions.config().gemini.key);
  const batch = db.batch();

  for (const findingDoc of findingsSnapshot.docs) {
    const explanation = await gemini.explain_finding(findingDoc.data(), { bankId, analysisId });
    batch.update(findingDoc.ref, { explanation });
  }

  await batch.commit();
}

export const health = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: "ok",
    service: "kohei-functions"
  });
});

export const onDatasetUploaded = functions.firestore
  .document("banks/{bankId}/uploads/{uploadId}")
  .onCreate(async (snap, context) => {
    const { bankId, uploadId } = context.params;
    const uploadData = snap.data();

    try {
      logInfo("Dataset upload received", { bankId, uploadId });

      await snap.ref.update({ status: "processing" });
      await updateProgress(bankId, uploadId, "download", 10);

      const bucket = admin.storage().bucket();
      const filePath = uploadData.storagePath;
      const tempFilePath = `/tmp/${uploadId}.csv`;
      await bucket.file(filePath).download({ destination: tempFilePath });

      await updateProgress(bankId, uploadId, "analysis", 35);
      const analysisResult = await runBiasAnalysis(
        tempFilePath,
        uploadData.columnClassifications,
        bankId,
        uploadId
      );

      await updateProgress(bankId, uploadId, "write_results", 55);
      const analysisRef = db.collection("banks").doc(bankId).collection("analyses").doc();

      await analysisRef.set({
        uploadId,
        status: "review_required",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        results: analysisResult,
        findingsCount: analysisResult.findings.length
      });

      const batch = db.batch();
      analysisResult.findings.forEach((finding: any, index: number) => {
        const findingRef = analysisRef.collection("findings").doc();
        batch.set(findingRef, {
          ...finding,
          status: "pending",
          order: index,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();

      await updateProgress(bankId, uploadId, "explanations", 75);
      await generateExplanations(analysisRef.id, bankId);

      await snap.ref.update({
        status: "complete",
        analysisId: analysisRef.id
      });

      await updateProgress(bankId, uploadId, "complete", 100);
      logInfo("Analysis completed", { bankId, uploadId, analysisId: analysisRef.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logError("Analysis failed", { bankId, uploadId, error: message });
      await snap.ref.update({
        status: "error",
        error: message
      });
      await updateProgress(bankId, uploadId, "error", 100);
      throw error;
    }
  });
