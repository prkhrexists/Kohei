#!/usr/bin/env python3
"""
Kōhei Bias Analysis CLI Runner

Usage:
    python run_analysis.py <csv_file> <column_classifications_json> <bank_id> <upload_id>

Returns:
    JSON string with analysis results
"""

from __future__ import annotations

import json
import sys

import pandas as pd

from bias_engine import BiasAnalysisEngine


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python run_analysis.py <csv_file> <classifications> [bank_id] [upload_id]", file=sys.stderr)
        sys.exit(1)

    csv_file = sys.argv[1]
    classifications = json.loads(sys.argv[2])
    bank_id = sys.argv[3] if len(sys.argv) > 3 else "unknown"
    upload_id = sys.argv[4] if len(sys.argv) > 4 else "unknown"

    try:
        df = pd.read_csv(csv_file)

        engine = BiasAnalysisEngine()
        engine.df = df
        engine.column_classifications = classifications

        engine.preprocess_data()
        engine.detect_proxies()

        model_blob_path = classifications.get("model_blob_path", "models/propensity.onnx")
        engine.run_twin_matching(classifications.get("protected", []), model_blob_path)
        engine.compute_standard_metrics()
        engine.generate_findings()

        payload = engine.build_results_payload()
        payload["bank_id"] = bank_id
        payload["upload_id"] = upload_id

        print(json.dumps(payload, indent=2))
    except Exception as exc:
        error_result = {
            "error": str(exc),
            "status": "failed",
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
