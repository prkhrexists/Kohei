"""Kohei bias analysis engine for Firebase Cloud Functions.

This module provides a full bias analysis pipeline with proxy detection,
identical twin matching, and standard fairness metrics.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.feature_selection import mutual_info_classif
from sklearn.neighbors import KDTree

import onnxruntime as ort

try:
    import firebase_admin
    from firebase_admin import storage
except Exception:  # pragma: no cover - optional in local runs
    firebase_admin = None
    storage = None


logger = logging.getLogger("kohei.bias_engine")
logger.setLevel(logging.INFO)


ProgressCallback = Optional[Callable[[str, float, Dict[str, Any]], None]]


def _safe_invoke_progress(callback: ProgressCallback, stage: str, progress: float, meta: Dict[str, Any]) -> None:
    if callback is None:
        return
    try:
        callback(stage, progress, meta)
    except Exception as exc:
        logger.warning("Progress callback failed: %s", exc)


def _validate_columns(df: pd.DataFrame, columns: List[str], label: str) -> None:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing {label} columns: {missing}")


def _coerce_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _compute_confidence_interval(p: float, n: int, alpha: float = 0.05) -> Tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    z = stats.norm.ppf(1 - alpha / 2)
    se = np.sqrt(max(p * (1 - p), 1e-9) / n)
    return max(p - z * se, 0.0), min(p + z * se, 1.0)


def _proportion_ztest(p1: float, n1: int, p2: float, n2: int) -> float:
    if n1 == 0 or n2 == 0:
        return 1.0
    p_pool = (p1 * n1 + p2 * n2) / (n1 + n2)
    se = np.sqrt(max(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2), 1e-9))
    z = (p1 - p2) / se
    return 2 * (1 - stats.norm.cdf(abs(z)))


@dataclass
class ProxyFinding:
    feature: str
    protected_attribute: str
    mutual_information: float
    chi2_p_value: float


class ProxyDetector:
    """Detect proxy variables using mutual information and chi-square tests."""

    def analyze_correlations(
        self,
        df: pd.DataFrame,
        financial_cols: List[str],
        protected_cols: List[str],
    ) -> List[ProxyFinding]:
        results: List[ProxyFinding] = []

        for protected in protected_cols:
            protected_codes = df[protected].astype("category").cat.codes

            numeric_df = df[financial_cols].copy()
            numeric_df = numeric_df.apply(_coerce_numeric, axis=0)
            numeric_df = numeric_df.fillna(numeric_df.median(numeric_only=True))

            mi_scores = mutual_info_classif(numeric_df, protected_codes, discrete_features=False)

            for feature, mi in zip(financial_cols, mi_scores):
                # Chi-square test on binned numeric data to detect dependency.
                binned = pd.qcut(numeric_df[feature], q=5, duplicates="drop")
                contingency = pd.crosstab(binned, df[protected])
                chi2, p_value, _, _ = stats.chi2_contingency(contingency)
                results.append(
                    ProxyFinding(
                        feature=feature,
                        protected_attribute=protected,
                        mutual_information=float(mi),
                        chi2_p_value=float(p_value),
                    )
                )

        # Rank by mutual information descending.
        results.sort(key=lambda r: r.mutual_information, reverse=True)
        return results


class StandardMetrics:
    """Standard fairness metrics with statistical validation."""

    def compute_air(self, df: pd.DataFrame, protected_col: str, decision_col: str) -> Dict[str, Any]:
        groups = df[protected_col].dropna().unique()
        rates = df.groupby(protected_col)[decision_col].mean().to_dict()
        counts = df.groupby(protected_col)[decision_col].count().to_dict()

        if not groups.size:
            return {"air": None, "rates": rates}

        majority = df[protected_col].value_counts().idxmax()
        majority_rate = rates.get(majority, 0)
        air = {}

        for group in groups:
            group_rate = rates.get(group, 0)
            air[group] = group_rate / majority_rate if majority_rate > 0 else 0

        return {
            "air": air,
            "rates": rates,
            "counts": counts,
            "majority_group": majority,
        }

    def compute_statistical_parity(self, df: pd.DataFrame, protected_col: str, decision_col: str) -> Dict[str, Any]:
        rates = df.groupby(protected_col)[decision_col].mean().to_dict()
        majority = df[protected_col].value_counts().idxmax()
        majority_rate = rates.get(majority, 0)

        parity = {}
        p_values = {}
        for group, rate in rates.items():
            count_group = df[df[protected_col] == group][decision_col].count()
            count_majority = df[df[protected_col] == majority][decision_col].count()
            parity[group] = rate - majority_rate
            p_values[group] = _proportion_ztest(rate, count_group, majority_rate, count_majority)

        return {
            "statistical_parity_difference": parity,
            "p_values": p_values,
            "majority_group": majority,
        }

    def compute_equalized_odds(
        self,
        df: pd.DataFrame,
        protected_col: str,
        decision_col: str,
        true_label_col: Optional[str] = None,
    ) -> Dict[str, Any]:
        if true_label_col is None or true_label_col not in df.columns:
            return {
                "warning": "True label column not provided. Equalized odds cannot be computed.",
                "tpr": None,
                "fpr": None,
            }

        results = {"tpr": {}, "fpr": {}}
        for group in df[protected_col].dropna().unique():
            subset = df[df[protected_col] == group]
            y_true = subset[true_label_col]
            y_pred = subset[decision_col]
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
            tpr = tp / (tp + fn) if (tp + fn) > 0 else 0
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
            results["tpr"][group] = tpr
            results["fpr"][group] = fpr
        return results

    def compute_theil_index(self, df: pd.DataFrame, protected_col: str, decision_col: str) -> Dict[str, Any]:
        # Theil index for inequality of positive outcomes across groups.
        group_rates = df.groupby(protected_col)[decision_col].mean()
        overall_rate = df[decision_col].mean()
        if overall_rate == 0:
            return {"theil_index": 0}
        theil = (group_rates / overall_rate * np.log((group_rates + 1e-9) / overall_rate)).mean()
        return {"theil_index": float(theil)}


class TwinMatchingEngine:
    """Lightweight twin matching using an ONNX propensity model."""

    def __init__(self, model_blob_path: str):
        self.model_blob_path = model_blob_path
        self.session: Optional[ort.InferenceSession] = None

    def _load_model(self) -> None:
        if self.session is not None:
            return

        if storage is None:
            raise RuntimeError("firebase_admin storage is not available.")

        if firebase_admin is not None and not firebase_admin._apps:
            firebase_admin.initialize_app()

        bucket = storage.bucket()
        blob = bucket.blob(self.model_blob_path)
        model_bytes = blob.download_as_bytes()
        self.session = ort.InferenceSession(model_bytes, providers=["CPUExecutionProvider"])

    def find_matches(
        self,
        df: pd.DataFrame,
        protected_col: str,
        financial_features: List[str],
        caliper: float = 0.1,
    ) -> pd.DataFrame:
        self._load_model()

        majority_group = df[protected_col].value_counts().idxmax()
        majority_df = df[df[protected_col] == majority_group]
        minority_df = df[df[protected_col] != majority_group]

        input_name = self.session.get_inputs()[0].name
        X = df[financial_features].astype(float).to_numpy()
        scores = self.session.run(None, {input_name: X})[1][:, 1]

        df = df.copy()
        df["propensity_score"] = scores

        tree = KDTree(majority_df[["propensity_score"]].values)
        distances, indices = tree.query(minority_df[["propensity_score"]].values, k=1)

        matches = []
        for i, (distance, idx) in enumerate(zip(distances.flatten(), indices.flatten())):
            if distance <= caliper:
                matches.append(
                    {
                        "minority_index": minority_df.iloc[i].name,
                        "majority_index": majority_df.iloc[idx].name,
                        "score_distance": float(distance),
                        "protected_col": protected_col,
                        "minority_group": minority_df.iloc[i][protected_col],
                        "majority_group": majority_df.iloc[idx][protected_col],
                    }
                )
        return pd.DataFrame(matches)

    def compute_divergence_stats(self, matched_pairs: pd.DataFrame, decision_col: str, df: pd.DataFrame) -> Dict[str, Any]:
        if matched_pairs.empty:
            return {"pair_count": 0, "air": None, "minority_rate": None, "majority_rate": None}

        minority_outcomes = df.loc[matched_pairs["minority_index"], decision_col].values
        majority_outcomes = df.loc[matched_pairs["majority_index"], decision_col].values

        minority_rate = minority_outcomes.mean()
        majority_rate = majority_outcomes.mean()
        air = minority_rate / majority_rate if majority_rate > 0 else 0
        divergence_rate = float((minority_outcomes != majority_outcomes).mean()) if len(minority_outcomes) else 0.0

        ci_minor = _compute_confidence_interval(minority_rate, len(minority_outcomes))
        ci_major = _compute_confidence_interval(majority_rate, len(majority_outcomes))
        p_value = _proportion_ztest(minority_rate, len(minority_outcomes), majority_rate, len(majority_outcomes))

        return {
            "pair_count": len(matched_pairs),
            "minority_rate": float(minority_rate),
            "majority_rate": float(majority_rate),
            "air": float(air),
            "divergence_rate": divergence_rate,
            "minority_ci": ci_minor,
            "majority_ci": ci_major,
            "p_value": float(p_value),
        }


class BiasAnalysisEngine:
    """End-to-end bias analysis pipeline."""

    def __init__(self, progress_callback: ProgressCallback = None):
        self.progress_callback = progress_callback
        self.df: Optional[pd.DataFrame] = None
        self.column_classifications: Dict[str, List[str]] = {}
        self.results: Dict[str, Any] = {}

    def load_data(self, file_path: str, column_classifications: Dict[str, List[str]]) -> None:
        _safe_invoke_progress(self.progress_callback, "load_data", 0.05, {"file": file_path})
        df = pd.read_csv(file_path)
        self.column_classifications = column_classifications

        financial_cols = column_classifications.get("financial", [])
        protected_cols = column_classifications.get("protected", [])
        decision_col = column_classifications.get("decision", [])

        if isinstance(decision_col, list):
            if len(decision_col) != 1:
                raise ValueError("Provide exactly one decision column.")
            decision_col = decision_col[0]
        column_classifications["decision"] = [decision_col]

        _validate_columns(df, financial_cols, "financial")
        _validate_columns(df, protected_cols, "protected")
        _validate_columns(df, [decision_col], "decision")

        self.df = df
        _safe_invoke_progress(self.progress_callback, "load_data", 0.1, {"rows": len(df)})

    def preprocess_data(self) -> None:
        if self.df is None:
            raise ValueError("Data not loaded.")

        df = self.df.copy()
        financial_cols = self.column_classifications.get("financial", [])
        protected_cols = self.column_classifications.get("protected", [])
        decision_col = self.column_classifications.get("decision", [None])[0]

        for col in financial_cols:
            df[col] = _coerce_numeric(df[col])
            df[col] = df[col].fillna(df[col].median())

        for col in protected_cols:
            df[col] = df[col].fillna("Unknown")

        df[decision_col] = _coerce_numeric(df[decision_col]).fillna(0).astype(int)

        self.df = df
        _safe_invoke_progress(self.progress_callback, "preprocess", 0.2, {})

    def detect_proxies(self) -> List[ProxyFinding]:
        if self.df is None:
            raise ValueError("Data not loaded.")

        detector = ProxyDetector()
        findings = detector.analyze_correlations(
            self.df,
            self.column_classifications.get("financial", []),
            self.column_classifications.get("protected", []),
        )
        self.results["proxy_findings"] = [finding.__dict__ for finding in findings]
        _safe_invoke_progress(self.progress_callback, "proxy_detection", 0.35, {"count": len(findings)})
        return findings

    def run_twin_matching(self, protected_attributes: List[str], model_blob_path: str) -> Dict[str, Any]:
        if self.df is None:
            raise ValueError("Data not loaded.")

        engine = TwinMatchingEngine(model_blob_path=model_blob_path)
        decision_col = self.column_classifications.get("decision", [None])[0]
        financial_cols = self.column_classifications.get("financial", [])

        results = {}
        for idx, protected_col in enumerate(protected_attributes):
            matches = engine.find_matches(self.df, protected_col, financial_cols)
            stats = engine.compute_divergence_stats(matches, decision_col, self.df)
            results[protected_col] = {"stats": stats, "pair_count": len(matches)}
            _safe_invoke_progress(
                self.progress_callback,
                "twin_matching",
                0.35 + 0.2 * (idx + 1) / max(len(protected_attributes), 1),
                {"protected_col": protected_col, "pairs": len(matches)},
            )

        self.results["twin_matching"] = results
        return results

    def compute_standard_metrics(self) -> Dict[str, Any]:
        if self.df is None:
            raise ValueError("Data not loaded.")

        metrics = StandardMetrics()
        protected_cols = self.column_classifications.get("protected", [])
        decision_col = self.column_classifications.get("decision", [None])[0]
        true_label_col = self.column_classifications.get("label", [None])[0]

        results = {}
        for col in protected_cols:
            results[col] = {
                "air": metrics.compute_air(self.df, col, decision_col),
                "statistical_parity": metrics.compute_statistical_parity(self.df, col, decision_col),
                "equalized_odds": metrics.compute_equalized_odds(self.df, col, decision_col, true_label_col),
                "theil_index": metrics.compute_theil_index(self.df, col, decision_col),
            }

        self.results["standard_metrics"] = results
        _safe_invoke_progress(self.progress_callback, "metrics", 0.75, {})
        return results

    def generate_findings(self) -> List[Dict[str, Any]]:
        findings = []
        twin_results = self.results.get("twin_matching", {})

        for protected_col, data in twin_results.items():
            stats = data.get("stats", {})
            air = stats.get("air")
            severity = "low"
            if air is not None:
                if air < 0.8:
                    severity = "high"
                elif air < 0.9:
                    severity = "medium"
            findings.append(
                {
                    "type": "twin_matching_divergence",
                    "protected_attribute": protected_col,
                    "air": air,
                    "pair_count": stats.get("pair_count"),
                    "p_value": stats.get("p_value"),
                    "severity": severity,
                }
            )

        self.results["findings"] = findings
        _safe_invoke_progress(self.progress_callback, "findings", 0.9, {"count": len(findings)})
        return findings

    def export_results(self) -> Dict[str, Any]:
        _safe_invoke_progress(self.progress_callback, "export", 0.98, {})
        return self.results

    def build_results_payload(self) -> Dict[str, Any]:
        if self.df is None:
            raise ValueError("Data not loaded.")

        decision_col = self.column_classifications.get("decision", [None])[0]
        protected_cols = self.column_classifications.get("protected", [])

        overall_metrics = {
            "total_applicants": int(len(self.df)),
            "approval_rate": float(self.df[decision_col].mean()) if decision_col in self.df.columns else 0.0,
            "groups_tested": int(sum(self.df[col].nunique() for col in protected_cols)),
        }

        proxy_variables = [
            {
                "feature": finding["feature"],
                "protected_attribute": finding["protected_attribute"],
                "mi_score": finding["mutual_information"],
            }
            for finding in self.results.get("proxy_findings", [])
            if finding.get("mutual_information", 0) > 0.15
        ]

        findings_payload = []
        twin_results = self.results.get("twin_matching", {})
        for protected_col, data in twin_results.items():
            stats = data.get("stats", {})
            if stats.get("air") is None:
                continue
            findings_payload.append(
                {
                    "id": f"finding_{protected_col}",
                    "attribute": protected_col,
                    "protected_group": stats.get("minority_group", "minority"),
                    "comparison_group": stats.get("majority_group", "majority"),
                    "severity": "HIGH" if stats.get("air", 1) < 0.8 else "MEDIUM" if stats.get("air", 1) < 0.9 else "LOW",
                    "air_score": stats.get("air"),
                    "twin_divergence_rate": stats.get("divergence_rate", 0),
                    "affected_count": stats.get("pair_count", 0),
                    "top_features": [],
                    "statistical_significance": stats.get("p_value"),
                    "confidence_interval": [
                        stats.get("minority_ci", (0, 0))[0],
                        stats.get("minority_ci", (0, 0))[1],
                    ],
                }
            )

        overall_metrics["compliant_groups"] = len(
            [finding for finding in findings_payload if finding["air_score"] >= 0.8]
        )
        overall_metrics["non_compliant_groups"] = len(
            [finding for finding in findings_payload if finding["air_score"] < 0.8]
        )

        return {
            "status": "success",
            "findings": findings_payload,
            "proxy_variables": proxy_variables,
            "overall_metrics": overall_metrics,
        }


def run_full_analysis(
    df: pd.DataFrame,
    column_classifications: dict,
    bank_id: str,
    upload_id: str,
    model_blob_path: str,
    progress_callback: ProgressCallback = None,
) -> Dict[str, Any]:
    """
    Complete bias analysis pipeline.
    Returns structured results ready for Firestore.
    """

    engine = BiasAnalysisEngine(progress_callback=progress_callback)
    engine.df = df
    engine.column_classifications = column_classifications

    try:
        engine.preprocess_data()
        proxies = engine.detect_proxies()
        engine.run_twin_matching(column_classifications.get("protected", []), model_blob_path)
        engine.compute_standard_metrics()
        engine.generate_findings()
        results = engine.export_results()
    except Exception as exc:
        logger.exception("Bias analysis failed: %s", exc)
        return {
            "status": "error",
            "bank_id": bank_id,
            "upload_id": upload_id,
            "error": str(exc),
        }

    proxy_summary = [finding.__dict__ for finding in proxies]

    return {
        "status": "complete",
        "bank_id": bank_id,
        "upload_id": upload_id,
        "results": results,
        "proxy_summary": proxy_summary,
    }
