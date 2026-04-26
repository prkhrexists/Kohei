# Contributing to Kōhei

First off — **thank you** for taking the time to contribute! 🎉  
Kōhei is an open-source AI fairness platform and every contribution, no matter how small, makes a real difference.

Please read this guide before opening issues or pull requests.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold these standards. Please report unacceptable behaviour to [team@kohei.dev](mailto:team@kohei.dev).

---

## How Can I Contribute?

### 🐛 Bug Reports
Found a bug? [Open an issue](#reporting-bugs) with a clear reproduction case.

### 💡 Feature Requests
Have an idea? [Open a feature request](#suggesting-features) and describe the problem it solves.

### 📝 Documentation
Typos, outdated docs, missing examples — all PRs gratefully accepted.

### 🔧 Code Contributions
From small fixes to new ML fairness metrics — see the setup guide below.

---

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/kohei.git
cd kohei

# 2. Run setup
chmod +x scripts/setup_env.sh
./scripts/setup_env.sh

# 3. Create your env file
cp .env.example frontend/.env.local
# Fill in your Firebase + Gemini credentials

# 4. Start local dev
cd frontend && npm run dev          # Terminal 1 — Vite dev server
firebase emulators:start            # Terminal 2 — Firebase emulators
```

### Project Areas

| Area | Location | Key Technologies |
|------|----------|-----------------|
| Frontend UI | `frontend/src/` | React 18, TypeScript, shadcn/ui |
| Cloud Functions | `functions/src/` | Node.js 18, TypeScript |
| Bias Engine | `functions/src/python/` | Python, scikit-learn, AIF360 |
| ML Notebooks | `notebooks/` | Google Colab, SHAP |
| CI/CD | `.github/workflows/` | GitHub Actions |
| Deploy scripts | `scripts/` | Bash |

---

## Branch & Commit Conventions

### Branches

```
main              → production-ready code
feature/<name>    → new features
fix/<name>        → bug fixes
docs/<name>       → documentation only
chore/<name>      → tooling, CI, deps
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no new feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies |
| `ci` | CI/CD configuration |

**Examples:**

```
feat(bias-engine): add intersectional bias detection via AIF360
fix(upload): handle malformed CSV headers gracefully
docs(readme): update quick-start instructions
chore(deps): bump firebase-tools to 13.x
```

---

## Pull Request Process

1. **Sync your fork** before starting:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and write/update tests where applicable.

4. **Verify everything passes:**
   ```bash
   # TypeScript
   cd frontend && npx tsc --noEmit

   # Python
   cd functions && python -m pytest test/ -v
   ```

5. **Commit** using conventional commits.

6. **Open a PR** against `main` with:
   - A clear title and description
   - Reference to the related issue (e.g., `Closes #42`)
   - Screenshots for UI changes

7. **Address review feedback** promptly.

PRs require **at least one approving review** before merge.

---

## Code Style

### TypeScript / React

- **Formatter:** Prettier (config in `frontend/.prettierrc` if present)
- **Linter:** ESLint
- Prefer functional components and React hooks
- Keep components focused and under ~200 lines
- Use `shadcn/ui` primitives rather than custom replacements

### Python

- **Formatter:** Black (`pip install black && black .`)
- **Linter:** flake8
- Type annotations encouraged
- Docstrings for all public functions

### General

- No commented-out code in PRs
- Remove unused imports
- Prefer descriptive variable names over comments

---

## Reporting Bugs

Before filing a bug report, please:
- Check [existing issues](https://github.com/yourusername/kohei/issues) to avoid duplicates
- Try to reproduce on the latest `main`

When filing, include:

```markdown
**Describe the bug**
A clear description of what happened.

**Steps to reproduce**
1. Go to '...'
2. Upload file '...'
3. Click '...'
4. See error

**Expected behaviour**
What you expected to happen.

**Screenshots / logs**
If applicable.

**Environment**
- OS: [e.g. macOS 14, Windows 11]
- Node.js version: [e.g. 18.19]
- Browser: [e.g. Chrome 124]
```

---

## Suggesting Features

Open a [GitHub Discussion](https://github.com/yourusername/kohei/discussions) or issue with:

```markdown
**Problem**
What problem does this feature solve?

**Proposed Solution**
How would you implement it?

**Alternatives Considered**
Any other approaches you thought of?

**Additional Context**
Links, mockups, research papers, etc.
```

---

## 🙏 Thank You

Every contribution helps make AI fairer in banking.  
**Kōhei (公平) — Making AI Fair for Everyone.**
