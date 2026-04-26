#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  Kōhei — Firebase Deployment Script
#  Usage: ./scripts/deploy.sh [--functions-only | --hosting-only | --all]
# ─────────────────────────────────────────────

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ───────────────────────────────────
log_step()  { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
log_ok()    { echo -e "${GREEN}✔  $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error() { echo -e "${RED}✘  $1${NC}" >&2; }
log_info()  { echo -e "${CYAN}   $1${NC}"; }

divider() { echo -e "${BLUE}────────────────────────────────────────────${NC}"; }

# ── Banner ────────────────────────────────────
divider
echo -e "${BOLD}${CYAN}"
echo "  🚀  Kōhei — Deploying to Firebase"
echo -e "${NC}"
divider

# ── Parse arguments ───────────────────────────
DEPLOY_TARGET="all"
for arg in "$@"; do
  case $arg in
    --functions-only) DEPLOY_TARGET="functions" ;;
    --hosting-only)   DEPLOY_TARGET="hosting"   ;;
    --all)            DEPLOY_TARGET="all"        ;;
    *)
      log_warn "Unknown argument: $arg  (ignored)"
      ;;
  esac
done
log_info "Deploy target: ${BOLD}${DEPLOY_TARGET}${NC}"

# ── Prerequisite checks ───────────────────────
log_step "Checking prerequisites"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    log_error "'$1' is required but not installed. Aborting."
    exit 1
  fi
  log_ok "$1 found"
}

check_cmd node
check_cmd npm
check_cmd firebase

# Check Firebase login
if ! firebase projects:list &>/dev/null 2>&1; then
  log_error "Not logged in to Firebase. Run: firebase login"
  exit 1
fi
log_ok "Firebase authenticated"

# Check env file
if [ ! -f "frontend/.env.local" ] && [ ! -f "frontend/.env" ]; then
  log_warn "No frontend/.env.local found. Using defaults — make sure Firebase config vars are set."
fi

# ── Install dependencies ──────────────────────
log_step "Installing frontend dependencies"
(cd frontend && npm ci --prefer-offline 2>&1 | tail -5)
log_ok "Frontend deps installed"

log_step "Installing functions dependencies"
(cd functions && npm ci --prefer-offline 2>&1 | tail -5)
log_ok "Functions deps installed"

# ── Build frontend ────────────────────────────
if [ "$DEPLOY_TARGET" != "functions" ]; then
  log_step "Building frontend (Vite)"
  (cd frontend && npm run build)
  log_ok "Frontend built → frontend/dist/"
fi

# ── Set Gemini API key ────────────────────────
if [ -n "$GEMINI_API_KEY" ]; then
  log_step "Setting runtime environment variables"
  firebase functions:config:set \
    gemini.key="$GEMINI_API_KEY" \
    --project "$(firebase use)" 2>/dev/null || \
  log_warn "Could not set functions config (non-fatal if using Secret Manager)"
  log_ok "Gemini API key configured"
else
  log_warn "GEMINI_API_KEY is not set — skipping functions:config:set"
fi

# ── Deploy ────────────────────────────────────
log_step "Deploying to Firebase"

case "$DEPLOY_TARGET" in
  functions)
    TARGETS="functions"
    ;;
  hosting)
    TARGETS="hosting,firestore,storage"
    ;;
  all)
    TARGETS="hosting,firestore,storage,functions"
    ;;
esac

log_info "Targets: ${TARGETS}"
firebase deploy --only "$TARGETS"

# ── Done ──────────────────────────────────────
divider
echo -e "${GREEN}${BOLD}"
echo "  ✅  Deployment complete!"
echo -e "${NC}"

if [ "$DEPLOY_TARGET" != "functions" ]; then
  HOSTING_URL=$(firebase hosting:channel:list 2>/dev/null | grep live | awk '{print $4}' || true)
  if [ -n "$HOSTING_URL" ]; then
    echo -e "  🌐  Live URL: ${CYAN}${BOLD}${HOSTING_URL}${NC}"
  else
    echo -e "  🌐  Check your Firebase console for the live URL."
  fi
fi

divider
