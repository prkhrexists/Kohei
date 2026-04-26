import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { generateBiasReportPDF } from "./pdfGenerator";

interface ReportConfig {
  analysisId: string;
  reportType: "bias_research" | "fix_strategy" | "audit_package";
  sections: string[];
  signedBy: string;
}

export const generateReport = functions.https.onCall(async (data: ReportConfig, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { analysisId, reportType, sections } = data;

  try {
    const analysisDoc = await admin.firestore().collection("analyses").doc(analysisId).get();

    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Analysis not found");
    }

    const findingsSnapshot = await analysisDoc.ref
      .collection("findings")
      .where("status", "==", "confirmed")
      .get();

    const findings = findingsSnapshot.docs.map((doc) => doc.data());

    const pdfBuffer = await generateBiasReportPDF({
      analysis: analysisDoc.data(),
      findings,
      reportType,
      sections,
      signedBy: context.auth.uid
    });

    const bucket = admin.storage().bucket();
    const filename = `reports/${analysisId}_${Date.now()}.pdf`;
    const file = bucket.file(filename);

    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        analysisId,
        reportType,
        generatedBy: context.auth.uid
      }
    });

    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    const reportRef = await admin.firestore().collection("reports").add({
      analysisId,
      reportType,
      status: "ready",
      storagePath: filename,
      sha256Hash: hash,
      downloadUrl: url,
      generatedBy: context.auth.uid,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      reportId: reportRef.id,
      downloadUrl: url,
      sha256Hash: hash
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    console.error("Report generation failed:", error);
    throw new functions.https.HttpsError("internal", message);
  }
});
