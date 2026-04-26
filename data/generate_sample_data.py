"""Generate synthetic loan data with built-in bias for demos.

Outputs:
  - data/samples/full_loan_data.csv (5000 rows)
  - data/samples/demo_loan_data.csv (500 rows)
  - data/samples/data_dictionary.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


SEED = 42
TOTAL_ROWS = 5000
DEMO_ROWS = 500

OUTPUT_DIR = Path(__file__).resolve().parent / "samples"


PIN_CODES = [
    "110001",
    "110002",
    "110003",
    "110004",
    "110005",
    "400001",
    "400050",
    "500001",
    "500081",
    "560001",
    "560103",
    "600001",
    "600042",
    "700001",
    "700091",
    "380001",
    "380015",
    "411001",
    "411045",
    "302001",
]

NEGATIVE_ZONE_PINS = {"110001", "110002", "110003", "110004", "110005"}


def clip(values: np.ndarray, min_value: float, max_value: float) -> np.ndarray:
    return np.clip(values, min_value, max_value)


def generate_financial_features(rng: np.random.Generator, n: int) -> pd.DataFrame:
    """Generate financial features using realistic distributions (INR)."""
    # Annual income: log-normal around 10L, capped to 4L-30L.
    annual_income = rng.lognormal(mean=np.log(1_000_000), sigma=0.5, size=n)
    annual_income = clip(annual_income, 400_000, 3_000_000)

    # CIBIL score: normal mean 710, std 75, capped 300-900.
    cibil_score = rng.normal(loc=710, scale=75, size=n)
    cibil_score = clip(cibil_score, 300, 900)

    # FOIR ratio: 0.20-0.65.
    foir_ratio = rng.uniform(0.20, 0.65, size=n)

    # Employment years: 0-35 (skewed toward lower years).
    employment_years = rng.gamma(shape=2.2, scale=4.0, size=n)
    employment_years = clip(employment_years, 0, 35)

    # Loan amount: 2L - 75L (correlated with income).
    loan_amount = annual_income * rng.uniform(0.3, 2.0, size=n)
    loan_amount = clip(loan_amount, 200_000, 7_500_000)

    # Loan-to-value: 0.40-0.90.
    loan_to_value = rng.uniform(0.40, 0.90, size=n)

    return pd.DataFrame(
        {
            "annual_income": np.round(annual_income, 0),
            "cibil_score": np.round(cibil_score, 0),
            "foir_ratio": np.round(foir_ratio, 3),
            "employment_years": np.round(employment_years, 1),
            "loan_amount": np.round(loan_amount, 0),
            "loan_to_value": np.round(loan_to_value, 3),
        }
    )


def generate_demographics(rng: np.random.Generator, n: int) -> pd.DataFrame:
    """Generate protected attributes based on Indian demographics."""
    social_category = rng.choice(
        ["General", "OBC", "SC", "ST"],
        size=n,
        p=[0.25, 0.45, 0.20, 0.10],
    )

    religion = rng.choice(
        ["Hindu", "Muslim", "Christian", "Sikh", "Other"],
        size=n,
        p=[0.80, 0.14, 0.02, 0.02, 0.02],
    )

    gender = rng.choice(
        ["Male", "Female", "Non-binary"],
        size=n,
        p=[0.51, 0.48, 0.01],
    )

    age = rng.normal(loc=36, scale=10, size=n)
    age = clip(age, 21, 75)

    return pd.DataFrame(
        {
            "social_category": social_category,
            "religion": religion,
            "gender": gender,
            "age": np.round(age, 0),
        }
    )


def generate_pin_codes(rng: np.random.Generator, n: int) -> pd.Series:
    """Pick from a fixed list of PIN codes (20 diverse locations)."""
    return pd.Series(rng.choice(PIN_CODES, size=n), name="pin_code")


def compute_approval_probability(df: pd.DataFrame) -> np.ndarray:
    """Compute approval probability using logistic function with bias."""
    # Base financial score (scaled to roughly -3..3).
    income_score = (np.log(df["annual_income"]) - np.log(800_000)) / 0.6
    cibil_score = (df["cibil_score"] - 650) / 60
    foir_score = (0.5 - df["foir_ratio"]) * 4.0
    employment_score = (df["employment_years"] - 5) / 10
    ltv_score = (0.8 - df["loan_to_value"]) * 3.0

    base_logit = (
        0.9 * income_score
        + 1.1 * cibil_score
        + 0.8 * foir_score
        + 0.4 * employment_score
        + 0.6 * ltv_score
        - 0.2
    )

    # Convert to probability.
    base_prob = 1 / (1 + np.exp(-base_logit))

    # Apply multiplicative bias penalties for protected groups.
    bias_multiplier = np.ones(len(df))

    # SC/ST: 15% lower approval rate.
    bias_multiplier *= np.where(
        df["social_category"].isin(["SC", "ST"]), 0.85, 1.0
    )

    # Muslim: 10% lower approval rate.
    bias_multiplier *= np.where(df["religion"] == "Muslim", 0.90, 1.0)

    # Female: 7% lower approval rate.
    bias_multiplier *= np.where(df["gender"] == "Female", 0.93, 1.0)

    # Age 60+: 12% lower approval rate.
    bias_multiplier *= np.where(df["age"] >= 60, 0.88, 1.0)

    # Negative zone PINs: 18% lower approval rate.
    bias_multiplier *= np.where(df["pin_code"].isin(NEGATIVE_ZONE_PINS), 0.82, 1.0)

    biased_prob = clip(base_prob * bias_multiplier, 0.01, 0.99)
    return biased_prob


def create_twin_pairs(df: pd.DataFrame, rng: np.random.Generator, pairs: int = 10) -> pd.DataFrame:
    """Create identical pairs with opposite outcomes for audit demos."""
    twin_indices = rng.choice(df.index, size=pairs, replace=False)
    twins = df.loc[twin_indices].copy()

    # Flip decision for twins to ensure opposite outcomes.
    twins["approved"] = 1 - twins["approved"]

    return pd.concat([df, twins], ignore_index=True)


def build_data(seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # Create 4980 rows, then add 10 twin pairs (20 rows) to reach 5000.
    base_rows = TOTAL_ROWS - 20

    financials = generate_financial_features(rng, base_rows)
    demographics = generate_demographics(rng, base_rows)
    pin_codes = generate_pin_codes(rng, base_rows)

    df = pd.concat([financials, demographics, pin_codes], axis=1)

    # Compute approval probability with bias and sample decisions.
    approval_prob = compute_approval_probability(df)
    approved = rng.binomial(1, approval_prob)

    df["approval_probability"] = np.round(approval_prob, 4)
    df["approved"] = approved

    # Add identical twin pairs with opposite outcomes.
    df = create_twin_pairs(df, rng, pairs=10)

    # Create a unique application ID after all rows are ready.
    df.insert(0, "application_id", [f"APP-{i+1:05d}" for i in range(len(df))])

    return df


def write_outputs(df: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    full_path = OUTPUT_DIR / "full_loan_data.csv"
    demo_path = OUTPUT_DIR / "demo_loan_data.csv"
    dict_path = OUTPUT_DIR / "data_dictionary.json"

    # Shuffle rows for realism, but keep deterministic ordering via seed.
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    df.to_csv(full_path, index=False)
    df.head(DEMO_ROWS).to_csv(demo_path, index=False)

    data_dictionary = {
        "application_id": "Unique loan application identifier.",
        "annual_income": "Annual income in INR (log-normal, 4L-30L).",
        "cibil_score": "Credit score (300-900).",
        "foir_ratio": "Fixed Obligation to Income Ratio (0.20-0.65).",
        "employment_years": "Total years of employment (0-35).",
        "loan_amount": "Requested loan amount in INR (2L-75L).",
        "loan_to_value": "Loan-to-value ratio (0.40-0.90).",
        "pin_code": "Applicant PIN code (20 diverse Indian codes).",
        "social_category": "Protected attribute: General/OBC/SC/ST.",
        "religion": "Protected attribute: Hindu/Muslim/Christian/Sikh/Other.",
        "gender": "Protected attribute: Male/Female/Non-binary.",
        "age": "Applicant age in years (21-75).",
        "approval_probability": "Model probability after bias adjustments.",
        "approved": "Decision label: 1=approved, 0=denied.",
    }

    with dict_path.open("w", encoding="utf-8") as handle:
        json.dump(data_dictionary, handle, indent=2)


def main() -> None:
    df = build_data()
    write_outputs(df)


if __name__ == "__main__":
    main()
