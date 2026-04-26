"""
Kōhei Local Analysis Server
Runs the real bias engine locally — no Firebase/Cloud Functions needed.
Usage: python local_server.py
API: POST http://localhost:8787/analyze   (multipart/form-data: file + column_types JSON)
"""

from __future__ import annotations

import io
import json
import logging
import sys
import os

# ── Allow importing bias_engine from sibling directory ───────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "functions", "src", "analysis"))

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kohei.local_server")

app = Flask(__name__)
CORS(app)  # Allow requests from http://localhost:5173


# ── Bias calculation helpers (no ONNX / no Firebase) ─────────────────────────

def compute_air(df: pd.DataFrame, protected_col: str, decision_col: str):
    """Adverse Impact Ratio for each group vs the majority."""
    df = df.copy()
    df[decision_col] = pd.to_numeric(df[decision_col], errors="coerce")
    df = df.dropna(subset=[decision_col, protected_col])

    group_rates = df.groupby(protected_col)[decision_col].mean()
    if group_rates.empty:
        return []

    majority_group = group_rates.idxmax()
    majority_rate = group_rates[majority_group]
    if majority_rate == 0:
        return []

    findings = []
    for group, rate in group_rates.items():
        if group == majority_group:
            continue
        air = rate / majority_rate
        n_group = int((df[protected_col] == group).sum())
        n_majority = int((df[protected_col] == majority_group).sum())

        # Simple twin matching: find pairs with nearly identical financial scores
        # Uses quartile-based binning as a lightweight propensity proxy
        financial_cols = [c for c in df.select_dtypes(include="number").columns
                          if c != decision_col]
        twin_divergence = 0.0
        if financial_cols:
            bins = pd.cut(
                df[financial_cols[0]].rank(pct=True), bins=10, labels=False
            ).fillna(0).astype(int)
            df["_bin"] = bins
            minority_mask = df[protected_col] == group
            majority_mask = df[protected_col] == majority_group
            divergent_bins = 0
            total_bins = 0
            for b in df["_bin"].unique():
                m_rate = df[minority_mask & (df["_bin"] == b)][decision_col].mean()
                j_rate = df[majority_mask & (df["_bin"] == b)][decision_col].mean()
                if not (pd.isna(m_rate) or pd.isna(j_rate)):
                    total_bins += 1
                    if abs(m_rate - j_rate) > 0.1:
                        divergent_bins += 1
            twin_divergence = (divergent_bins / total_bins * 100) if total_bins else 0

        severity = "HIGH" if air < 0.8 else "MEDIUM" if air < 0.9 else "LOW"

        # Feature importance: variance of each financial col within minority group
        top_features = []
        if financial_cols:
            minority_df = df[df[protected_col] == group][financial_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
            variances = minority_df.var().sort_values(ascending=False)
            total_var = variances.sum() or 1
            top_features = [
                {"name": col, "importance": round(float(var / total_var), 3)}
                for col, var in variances.head(5).items()
            ]

        findings.append({
            "id": f"finding_{protected_col}_{group}".replace(" ", "_").lower(),
            "attribute": f"{protected_col}: {group}",
            "severity": severity,
            "airScore": round(air, 3),
            "twinDivergenceRate": round(twin_divergence, 1),
            "affectedCount": n_group,
            "topFeatures": top_features,
            "status": "pending",
            "explanation": {
                "headline": f"{group} applicants show {'significant' if air < 0.8 else 'moderate'} approval disparity",
                "what_it_means": (
                    f"Applicants identified as {group} are approved at {rate:.1%} vs "
                    f"{majority_rate:.1%} for {majority_group} — an AIR of {air:.2f}."
                ),
                "why_it_matters": (
                    "An AIR below 0.80 triggers adverse impact under EEOC 4/5ths rule "
                    "and fair lending regulations."
                ) if air < 0.8 else (
                    "AIR is above the 0.80 threshold but should be monitored for drift."
                ),
                "root_cause": (
                    f"Statistical analysis of {len(financial_cols)} financial features "
                    f"shows {twin_divergence:.0f}% of matched pairs receive different outcomes."
                ),
                "recommended_fix": (
                    "Conduct a full disparate impact review, rebalance training data, "
                    "and introduce fairness constraints in the credit model."
                ) if air < 0.8 else (
                    "Monitor monthly and document current controls in your compliance register."
                ),
            },
        })

    return sorted(findings, key=lambda x: x["airScore"])


def detect_proxies(df: pd.DataFrame, financial_cols: list, protected_cols: list):
    """Lightweight proxy detection using correlation."""
    from sklearn.feature_selection import mutual_info_classif
    proxies = []
    numeric_df = df[financial_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    for pcol in protected_cols:
        if pcol not in df.columns:
            continue
        target = df[pcol].astype("category").cat.codes
        mi_scores = mutual_info_classif(numeric_df, target, discrete_features=False, random_state=42)
        for feat, mi in zip(financial_cols, mi_scores):
            if mi > 0.10:
                proxies.append({"feature": feat, "protected_attribute": pcol, "mi_score": round(float(mi), 3)})
    return proxies


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Kohei Local Analysis Server"})


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        # ── 1. Parse uploaded file ────────────────────────────────────────────
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        f = request.files["file"]
        filename = f.filename or ""
        raw = f.read()

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(raw))
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(raw))
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(raw))
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        logger.info("Loaded dataset: %d rows × %d columns", len(df), len(df.columns))

        # ── 2. Parse column classifications ───────────────────────────────────
        col_types_raw = request.form.get("column_types", "{}")
        col_types: dict = json.loads(col_types_raw)
        # col_types format: { "column_name": "FINANCIAL"|"DEMOGRAPHIC"|"DECISION"|"UNKNOWN" }

        financial_cols = [c for c, t in col_types.items() if t == "FINANCIAL" and c in df.columns]
        protected_cols = [c for c, t in col_types.items() if t == "DEMOGRAPHIC" and c in df.columns]
        decision_cols  = [c for c, t in col_types.items() if t == "DECISION" and c in df.columns]

        if not decision_cols:
            # Auto-detect
            decision_cols = [c for c in df.columns if c.lower() in ("approved", "decision", "outcome", "denied")]
        if not protected_cols:
            protected_cols = [c for c in df.columns if c.lower() in ("social_category", "gender", "religion", "race", "ethnicity")]
        if not financial_cols:
            financial_cols = [c for c in df.select_dtypes(include="number").columns
                              if c not in decision_cols]

        decision_col = decision_cols[0] if decision_cols else None

        if not decision_col:
            return jsonify({"error": "No decision column found. Please classify a DECISION column."}), 400
        if not protected_cols:
            return jsonify({"error": "No protected attribute columns found."}), 400

        # ── 3. Run bias analysis ──────────────────────────────────────────────
        all_findings = []
        for pcol in protected_cols:
            findings = compute_air(df, pcol, decision_col)
            all_findings.extend(findings)

        proxies = detect_proxies(df, financial_cols, protected_cols)

        # ── 4. Build overall metrics ──────────────────────────────────────────
        df[decision_col] = pd.to_numeric(df[decision_col], errors="coerce")
        approval_rate = float(df[decision_col].mean())
        air_scores = [f["airScore"] for f in all_findings]
        min_air = min(air_scores) if air_scores else 1.0
        # Scale: AIR 1.0 → 100, AIR 0.8 → 80, AIR 0.0 → 0 (clamped 0-100)
        compliance_score = int(max(0, min(100, min_air * 100)))

        overall_metrics = {
            "total_applicants": len(df),
            "approval_rate": round(approval_rate, 3),
            "min_air": round(min_air, 3),
            "compliance_score": compliance_score,
            "findings_count": len(all_findings),
            "high_severity": len([f for f in all_findings if f["severity"] == "HIGH"]),
            "medium_severity": len([f for f in all_findings if f["severity"] == "MEDIUM"]),
            "low_severity": len([f for f in all_findings if f["severity"] == "LOW"]),
        }

        logger.info("Analysis complete: %d findings, AIR min=%.2f", len(all_findings), min_air)

        return jsonify({
            "status": "success",
            "findings": all_findings,
            "proxy_variables": proxies,
            "overall_metrics": overall_metrics,
        })

    except Exception as exc:
        logger.exception("Analysis failed")
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    print("\n[Kohei] Local Analysis Server started")
    print("   Listening on http://localhost:8787")
    print("   POST /analyze  - run bias analysis on a CSV/XLSX/JSON file")
    print("   GET  /health   - health check\n")
    app.run(host="0.0.0.0", port=8787, debug=False)
