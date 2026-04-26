# Kōhei Demo Troubleshooting

## Quick Recovery Checklist
- Refresh app and sign in again.
- Confirm Firebase project/env vars are correct.
- Ensure Cloud Functions are deployed and healthy.
- Use backup screenshots if analysis pipeline lags.

## Common Issues

### 1) Login fails
Symptoms:
- Google sign-in popup closes or shows auth error.

Fix:
- Verify Firebase Auth Google provider is enabled.
- Check allowed domain includes demo host.
- Confirm `VITE_FIREBASE_*` values are correct.

### 2) Upload stuck at 0%
Symptoms:
- Progress bar does not move.

Fix:
- Check Storage rules and user auth state.
- Confirm file is under 100MB and CSV/XLSX/JSON.
- Open browser network tab for failed upload request.

### 3) Analysis never starts
Symptoms:
- Upload succeeds but no findings appear.

Fix:
- Check Firestore trigger path: `banks/{bankId}/uploads/{uploadId}`.
- Verify `storagePath` exists on upload doc.
- Check function logs for Python runner errors.

### 4) Gemini explanation missing
Symptoms:
- Findings load without explanation section.

Fix:
- Verify `gemini.key` is set in Functions config.
- Check rate limit and retry behavior in logs.
- Use fallback explanation templates in UI.

### 5) PDF generation fails
Symptoms:
- "Generate report" returns internal error.

Fix:
- Ensure `reportlab` dependency is installed in runtime.
- Confirm storage bucket write permissions.
- Validate report payload JSON schema.

## Backup Presentation Mode
- Open `demo/screenshots/` assets.
- Walk judges through each screenshot using `demo/DEMO_SCRIPT.md`.
- Emphasize that full logs and data are available if needed.

## Last-Resort Fallback
- Use pre-generated report PDF from storage.
- Demonstrate only dashboard + findings UI.
- Explain live run constraints and show architecture diagram.
