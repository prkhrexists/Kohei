# Kōhei Demo Script - Google Solutions Challenge 2025
## 5-Minute Live Demo Flow

### Pre-Demo Setup (2 minutes before)
1. Open platform in browser: https://kohei-demo.web.app
2. Sign in with demo Google account
3. Have sample dataset ready: `data/samples/demo_loan_data.csv`
4. Clear any existing analyses (start fresh)
5. Open browser dev tools (to show real-time Firestore updates - optional)

### Demo Flow (5 minutes total)

**[0:00 - 0:30] Introduction**

SCRIPT:
"Hi, I'm [name] and this is Kōhei - an AI fairness platform for enterprise banking. The name means 'fairness' in Japanese.

Banks are being fined billions for algorithmic bias in loan decisions, but they have no systematic way to detect it. Kōhei solves this with a novel 'Identical Twins' matching approach that finds bias other methods miss.

Let me show you how a bank compliance officer would use this."

[SHOW: Dashboard - clean, professional UI]

**[0:30 - 1:30] Upload Data**

SCRIPT:
"First, they upload their historical loan data."

[ACTION: Click "Upload New Dataset"]
[ACTION: Drag demo_loan_data.csv into dropzone]

"Kōhei automatically classifies columns - financial features in blue, demographic data in amber, decisions in green. This is a dataset of 500 loan applications."

[SHOW: Column classification preview - point out detected columns]
[SHOW: Detected protected attributes: race, gender, age]

[ACTION: Click "Start Analysis"]

**[1:30 - 2:15] Analysis Running**

SCRIPT:
"Now Kōhei runs our Identical Twins engine. It matches applicants who are financially identical - same income, same credit score, same debt-to-income ratio - but differ on demographics.

If two 'twins' got different outcomes, that's bias."

[SHOW: Loading animation with progress messages]
[SHOW: "Finding twin pairs... Analyzing divergence... Running statistical tests..."]

**[2:15 - 3:45] Anomaly Review**

SCRIPT:
"The analysis found 3 bias patterns. Instead of dumping a spreadsheet, Kōhei walks the compliance officer through each finding interactively."

[SHOW: Finding #1 appears - Race: Black applicants]

"Here's the first one: Black applicants have an Adverse Impact Ratio of 0.74 - below the regulatory threshold of 0.8. That means they're being approved at only 74% the rate of White applicants with identical financial profiles.

Look at this: of 48 twin pairs - financially identical applicants - 38% had different outcomes based solely on race."

[ACTION: Expand Gemini explanation]

"Kōhei uses Gemini AI to explain what this means in plain English: [read headline]. The root cause is a proxy variable - ZIP code is correlating with race. The recommended fix: remove ZIP code from the model.

This violates ECOA and Fair Housing Act - potential multi-million dollar exposure."

[ACTION: Click "Confirm Finding"]

[SHOW: Transition to Finding #2 - Gender]

"Second finding: Female applicants, AIR of 0.88 - borderline but compliant."

[ACTION: Click "Dismiss" - show dismissal reason dialog]
[ACTION: Type "Within acceptable range" and confirm]

[SHOW: Transition to Finding #3 - Age]

"Third: Age 65+ applicants."

[ACTION: Click "Escalate to Legal"]

**[3:45 - 4:30] Results & Report**

SCRIPT:
"All findings reviewed. Here's the summary: 1 confirmed, 1 dismissed, 1 escalated.

Now we generate the full bias research report."

[ACTION: Click "Generate Report"]
[SHOW: Report generation progress]
[SHOW: PDF downloads]

"This is an audit-ready PDF package: executive summary, detailed findings with statistical evidence, Gemini explanations, remediation strategy, digital signature, SHA-256 hash for legal defensibility.

The compliance officer can submit this directly to the CFPB."

[ACTION: Open PDF briefly, scroll through sections]

**[4:30 - 5:00] Close & Impact**

SCRIPT:
"From raw data to regulatory compliance in under 5 minutes.

Traditional bias audits take months and cost hundreds of thousands. Kōhei automates it.

Built entirely on Google's free tier: Firebase, Firestore, Gemini AI, Cloud Functions. The Identical Twins matching model was trained in Google Colab.

We're solving a $7.4 billion problem in fair lending compliance - and making AI safer for everyone.

Thank you."

[SHOW: Dashboard with completed analysis]

---

### Backup Plan (If Live Demo Fails)

Have screenshots ready:
1. Dashboard overview
2. Upload with column classification
3. Finding card with Gemini explanation
4. AIR dashboard showing 0.74 score
5. Generated PDF report

Walk through screenshots with same script.

---

### Judge Q&A Preparation

**Expected Questions:**

Q: "How is this different from existing bias detection tools?"
A: "Existing tools compute aggregate statistics like overall approval rates. They miss intersectional bias and can't explain WHY decisions were biased. Our Identical Twins approach finds individual pairs of applicants who SHOULD have gotten the same outcome but didn't - that's direct evidence of discrimination. Plus, Gemini explains each finding in regulatory language compliance officers understand."

Q: "What if the bank doesn't have demographic data?"
A: "We use BISG - Bayesian Improved Surname Geocoding - to impute race from name and ZIP code. It's an industry-standard statistical method used by CFPB itself."

Q: "How do you handle false positives?"
A: "The human-in-the-loop review lets compliance officers confirm or dismiss each finding. We also compute statistical significance and confidence intervals. A finding needs p < 0.05 and at least 30 twin pairs to be flagged."

Q: "Can banks game this by removing demographic data?"
A: "No - the proxy detection flags features that correlate with protected attributes. If you remove race but keep ZIP code, we catch that ZIP is a proxy for race. Regulators require testing for disparate IMPACT, not just disparate treatment."

Q: "What's your business model?"
A: "Freemium SaaS: free for datasets < 1000 rows, $500/month for small banks, $5K/month enterprise for large banks with API access and continuous monitoring. Built on Google Cloud, scales with Firebase."

Q: "How accurate is the Identical Twins matching?"
A: "We use propensity score matching with 0.1 standard deviation caliper and compute Standardized Mean Difference to verify match quality. Our method is based on peer-reviewed causal inference literature. We'll share the Colab notebook showing validation."
