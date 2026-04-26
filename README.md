<div align="center">

# 公平 Kōhei

### AI Fairness Platform for Enterprise Banking

[![Firebase](https://img.shields.io/badge/Firebase-Blaze-orange?logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org)
[![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?logo=google)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Google Solutions Challenge](https://img.shields.io/badge/Google_Solutions_Challenge-2025-4285F4?logo=google)](https://developers.google.com/community/gdsc-solution-challenge)

> **Detecting and remediating algorithmic bias in banking decisions using Identical Twins Matching and Gemini AI**

</div>

---

## 🎯 Problem

Banks face **$7.4B in fair lending fine exposure (2024–2027)** due to algorithmic bias in credit scoring and loan approvals. **89% of banks using ML models have no systematic bias audit process.** Regulators (CFPB, EU AI Act) are cracking down — but traditional bias audits:

| Challenge | Reality |
|-----------|---------|
| ⏱ Time | 6–12 months per audit |
| 💰 Cost | $200K–$500K per engagement |
| 👤 Access | Require expensive consultants |
| 🔍 Coverage | Miss intersectional bias patterns |

---

## 💡 Solution

Kōhei automates bias detection using a novel **Identical Twins Matching** approach:

1. **Find applicant pairs** who are financially identical (same income, credit score, debt-to-income ratio)
2. **If "twins" differing only on demographics** (race, gender, age) receive different outcomes → that's bias
3. **Generate plain-English explanations** via Gemini AI that compliance officers can act on
4. **Produce audit-ready compliance reports** with remediation strategies

> **From raw data to regulatory compliance in under 5 minutes.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           React Frontend (Vite)             │  ← Firebase Hosting
│         TypeScript + shadcn/ui             │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
    ┌──────────────▼──────────────────────┐
    │          Firebase Services          │
    │  Auth │ Firestore │ Storage │ Hosting│
    └──────────────┬──────────────────────┘
                   │ Cloud Functions
    ┌──────────────▼──────────────────────┐
    │       Python Bias Engine            │  ← Cloud Functions (Node → Python)
    │  scikit-learn │ AIF360 │ SHAP       │
    └──────────────┬──────────────────────┘
                   │ REST
    ┌──────────────▼──────────────────────┐
    │           Gemini 1.5 Flash          │  ← AI Explanations & Reports
    └─────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS |
| **Backend** | Firebase Functions (Node.js 18) |
| **ML Engine** | Python 3.11 — scikit-learn, pandas, AIF360, SHAP, ReportLab |
| **Database** | Firebase Firestore |
| **File Storage** | Firebase Storage |
| **Auth** | Firebase Authentication |
| **AI** | Gemini 1.5 Flash |
| **Training** | Google Colab (free T4 GPU) |
| **CI/CD** | GitHub Actions → Firebase Hosting |

### All Free Tier

- Firebase Blaze plan (pay-as-you-go, stays free within limits)
- Gemini API: 15 RPM free
- Google Colab: Free GPU access

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Python 3.9+](https://python.org)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Google account (for Firebase + Gemini API)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/kohei.git
cd kohei

# 2. Run the automated setup script
chmod +x scripts/setup_env.sh
./scripts/setup_env.sh

# 3. Create a Firebase project at console.firebase.google.com
#    Enable: Authentication, Firestore, Storage, Functions, Hosting

# 4. Get a Gemini API key from https://ai.google.dev

# 5. Fill in your credentials
nano frontend/.env.local   # add Firebase config + Gemini key

# 6. Log in and deploy
firebase login
firebase use --add          # select your Firebase project
./scripts/deploy.sh
```

### Run Locally

```bash
# Terminal 1 — Frontend dev server
cd frontend && npm run dev

# Terminal 2 — Firebase emulators (Auth, Firestore, Storage, Functions)
firebase emulators:start

# Open http://localhost:5173
```

### Environment Variables

Copy `.env.example` to `frontend/.env.local` and fill in your values:

```env
# Firebase Web App Config  (Firebase Console → Project Settings → Web App)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Firebase Admin
FIREBASE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Gemini API  (https://ai.google.dev)
GEMINI_API_KEY=
```

---

## 📊 Demo Flow

| Step | Action | Details |
|------|--------|---------|
| **1** | Upload Data | Drag-and-drop CSV of historical loan applications |
| **2** | Auto-Analysis | Kōhei detects protected attributes, runs Identical Twins matching |
| **3** | Review Findings | Walk through bias anomalies interactively with SHAP explanations |
| **4** | Generate Report | Audit-ready PDF with remediation strategy |
| **5** | Export | Download signed PDF for regulatory submission |

> **Sample dataset included:** `data/samples/demo_loan_data.csv` (500 rows with built-in bias patterns)

---

## 🧪 Testing

```bash
# Python unit tests
cd functions
python -m pytest test/ -v

# Frontend type-check
cd frontend
npx tsc --noEmit

# Frontend unit tests
cd frontend
npm test

# E2E tests (Cypress — optional)
npm run test:e2e
```

---

## 🎓 Google Colab Notebooks

All ML training notebooks live in `notebooks/`:

| Notebook | Purpose |
|----------|---------|
| `01_twin_matching_model.ipynb` | Train the Identical Twins matching model |
| `02_shap_analysis.ipynb` | Feature importance & bias attribution |
| `03_counterfactuals.ipynb` | DiCE counterfactual generation |

---

## 📁 Project Structure

```
kohei/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # UI components (shadcn/ui)
│   │   ├── pages/            # Route-level pages
│   │   ├── lib/              # Firebase config, utilities
│   │   └── types/            # TypeScript interfaces
│   ├── public/
│   └── package.json
│
├── functions/                # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts          # Function entrypoints
│   │   └── python/           # Python bias analysis engine
│   ├── requirements.txt      # Python deps
│   └── package.json
│
├── notebooks/                # Google Colab training notebooks
├── data/
│   └── samples/              # Demo datasets
├── scripts/
│   ├── deploy.sh             # Full deployment script
│   └── setup_env.sh          # One-time dev setup
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI/CD pipeline
├── firebase.json
├── firestore.rules
├── storage.rules
└── README.md
```

---

## 🏆 Impact

| Metric | Before Kōhei | With Kōhei |
|--------|-------------|------------|
| **Time to compliance** | 6–12 months | < 1 week |
| **Audit cost** | $200K–$500K | ~$500/month SaaS |
| **Bias detection** | Manual spot-checks | Systematic, automated |
| **Intersectional bias** | Missed | Detected via Twin Matching |
| **Explainability** | Technical jargon | Plain-English (Gemini) |

**Potential Scale:** 4,500+ US banks and 6,000+ EU banks are subject to AI fairness regulation.

---

## 🚢 Deployment

### Manual Deploy

```bash
# Deploy everything
./scripts/deploy.sh

# Deploy frontend only
./scripts/deploy.sh --hosting-only

# Deploy functions only
./scripts/deploy.sh --functions-only
```

### Automated CI/CD

Every push to `main` triggers the GitHub Actions pipeline:

1. **Lint** — TypeScript type check
2. **Build** — Vite production build
3. **Deploy** — Firebase hosting + functions + Firestore rules

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for required secrets.

---

## 🤝 Contributing

This project was built for **Google Solutions Challenge 2025**. Contributions are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [LICENSE](LICENSE) | MIT License |

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👥 Team

| Role | Contributor |
|------|------------|
| Full Stack Development | [Your Name] |
| ML Engineering | [Team Member 2] |
| UI/UX Design | [Team Member 3] |

---

## 📞 Contact

- 📧 Email: [team@kohei.dev](mailto:team@kohei.dev)
- 🐦 Twitter: [@kohei_ai](https://twitter.com/kohei_ai)
- 🌐 Website: [https://kohei.dev](https://kohei.dev)

---

<div align="center">

Built with ❤️ for **Google Solutions Challenge 2025**

**Kōhei (公平) — Making AI Fair for Everyone**

</div>
