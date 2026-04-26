#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  Kōhei — Development Environment Setup
#  Run once after cloning the repository.
#  Usage: ./scripts/setup_env.sh
# ─────────────────────────────────────────────

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_step()  { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
log_ok()    { echo -e "${GREEN}✔  $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error() { echo -e "${RED}✘  $1${NC}" >&2; }
log_info()  { echo -e "${CYAN}   $1${NC}"; }
divider()   { echo -e "${BLUE}────────────────────────────────────────────${NC}"; }

# ── Banner ────────────────────────────────────
divider
echo -e "${BOLD}${CYAN}"
echo "  ⚙️   Kōhei — Environment Setup"
echo -e "${NC}"
divider

# ── OS detection ──────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Linux*)   PLATFORM="linux"   ;;
  Darwin*)  PLATFORM="macos"   ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *)        PLATFORM="unknown" ;;
esac
log_info "Detected platform: ${BOLD}${PLATFORM}${NC}"

# ── Prerequisite checks ───────────────────────
log_step "Checking prerequisites"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    log_error "'$1' is required but not installed."
    log_info  "Install guide: $2"
    exit 1
  fi
  local version
  version=$("$1" --version 2>&1 | head -1)
  log_ok "$1  →  ${version}"
}

require_cmd node    "https://nodejs.org"
require_cmd npm     "https://nodejs.org"
require_cmd python3 "https://www.python.org/downloads/"
require_cmd pip3    "https://pip.pypa.io/en/stable/installation/"

# Node version gate (≥18 required for Firebase Functions)
NODE_MAJOR=$(node -e "process.stdout.write(process.version.replace('v','').split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  log_error "Node.js ≥ 18 is required (found v${NODE_MAJOR}). Please upgrade."
  exit 1
fi
log_ok "Node.js version is acceptable (v${NODE_MAJOR})"

# ── Firebase CLI ──────────────────────────────
log_step "Installing / updating Firebase CLI"
if command -v firebase &>/dev/null; then
  FB_VER=$(firebase --version 2>&1)
  log_ok "Firebase CLI already installed: ${FB_VER}"
else
  npm install -g firebase-tools
  log_ok "Firebase CLI installed: $(firebase --version)"
fi

# ── Frontend dependencies ─────────────────────
log_step "Installing frontend npm dependencies"
(cd frontend && npm install)
log_ok "frontend/node_modules ready"

# ── Functions dependencies ────────────────────
log_step "Installing functions npm dependencies"
(cd functions && npm install)
log_ok "functions/node_modules ready"

# ── Python dependencies ───────────────────────
log_step "Installing Python dependencies (functions/requirements.txt)"
if [ ! -f "functions/requirements.txt" ]; then
  log_warn "functions/requirements.txt not found — skipping Python install"
else
  pip3 install --upgrade pip -q
  pip3 install -r functions/requirements.txt
  log_ok "Python packages installed"
fi

# ── Create .env.local ─────────────────────────
log_step "Creating frontend/.env.local"

if [ -f "frontend/.env.local" ]; then
  log_warn "frontend/.env.local already exists — skipping to avoid overwriting your keys."
else
  cat > frontend/.env.local << 'EOF'
# ── Firebase Web App Config ──────────────────────────
# Get these from Firebase Console → Project Settings → Web App
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ── Firebase Admin / Service Account ────────────────
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# ── Gemini API ───────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key
EOF
  log_ok "frontend/.env.local created with placeholder values"
fi

# ── Firebase project selection ────────────────
log_step "Firebase project"
if command -v firebase &>/dev/null && firebase projects:list &>/dev/null 2>&1; then
  log_info "Listing available Firebase projects:"
  firebase projects:list 2>/dev/null || log_warn "Could not list projects (run 'firebase login' first)"
else
  log_warn "Not logged in to Firebase — run 'firebase login' after setup"
fi

# ── Summary ───────────────────────────────────
divider
echo -e "${GREEN}${BOLD}"
echo "  ✅  Environment setup complete!"
echo -e "${NC}"
echo -e "  ${BOLD}Next steps:${NC}"
echo -e "  ${CYAN}1.${NC}  Edit ${BOLD}frontend/.env.local${NC} with your real Firebase config values"
echo -e "  ${CYAN}2.${NC}  Run ${BOLD}firebase login${NC} to authenticate"
echo -e "  ${CYAN}3.${NC}  Run ${BOLD}firebase use --add${NC} to select / create a Firebase project"
echo -e "  ${CYAN}4.${NC}  Run ${BOLD}firebase init${NC} (only first time) to link Firestore & Storage"
echo -e "  ${CYAN}5.${NC}  Run ${BOLD}./scripts/deploy.sh${NC} to deploy everything"
echo -e "  ${CYAN}6.${NC}  Or run ${BOLD}cd frontend && npm run dev${NC} to start local dev server"
divider
