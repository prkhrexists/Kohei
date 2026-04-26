"""Live test of the Kohei local analysis server."""
import json
import urllib.request
import urllib.error

# Read test CSV
with open("data/samples/test_30rows.csv", "rb") as f:
    csv_data = f.read()

boundary = "KoheiTestBoundary123"
col_types = json.dumps({
    "annual_income": "FINANCIAL", "cibil_score": "FINANCIAL",
    "foir_ratio": "FINANCIAL", "employment_years": "FINANCIAL",
    "loan_amount": "FINANCIAL", "loan_to_value": "FINANCIAL",
    "social_category": "DEMOGRAPHIC", "religion": "DEMOGRAPHIC",
    "gender": "DEMOGRAPHIC", "approved": "DECISION",
    "application_id": "UNKNOWN", "age": "UNKNOWN",
    "pin_code": "UNKNOWN", "approval_probability": "UNKNOWN",
})

file_part = (
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"file\"; filename=\"test_30rows.csv\"\r\n"
    "Content-Type: text/csv\r\n\r\n"
).encode() + csv_data

col_part = (
    "\r\n--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"column_types\"\r\n\r\n"
    + col_types +
    "\r\n--" + boundary + "--\r\n"
).encode()

body = file_part + col_part

req = urllib.request.Request(
    "http://localhost:8787/analyze",
    data=body,
    headers={"Content-Type": "multipart/form-data; boundary=" + boundary},
    method="POST",
)

try:
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    print("STATUS:", result["status"])
    print("FINDINGS COUNT:", len(result["findings"]))
    print("METRICS:", json.dumps(result["overall_metrics"], indent=2))
    print()
    for f in result["findings"]:
        print(f"  [{f['severity']}] {f['attribute']}  AIR={f['airScore']}  affected={f['affectedCount']}")
    print()
    print("PROXY VARIABLES:", len(result.get("proxy_variables", [])))
    for p in result.get("proxy_variables", []):
        print(f"  {p['feature']} -> {p['protected_attribute']}  MI={p['mi_score']}")
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode())
except Exception as e:
    print("ERROR:", type(e).__name__, e)
