#!/usr/bin/env bash
#
# Pathly LMS — VPS installer
#
# Clones the repo, installs Node.js/PM2, configures Supabase env vars,
# builds, and runs the app under PM2. Safe to re-run: it updates an
# existing checkout instead of re-cloning, and restarts the PM2 process
# instead of duplicating it.
#
# This script does NOT touch nginx/certbot — bring your own reverse proxy
# (e.g. Nginx Proxy Manager) pointed at the port this app listens on.
#
# Usage:
#   ./install.sh
#   INSTALL_DIR=/srv/pathly PORT=3001 ./install.sh
#
set -euo pipefail

REPO_URL="https://github.com/benjamin-blanke/pathly-lms.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/pathly-lms}"
PORT="${PORT:-3000}"
PM2_APP_NAME="pathly"
NODE_MAJOR_MIN=20
TOTAL_STEPS=8
STEP=0

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; CYAN=$'\033[36m'
else
  BOLD=""; DIM=""; RESET=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""
fi

step() {
  STEP=$((STEP + 1))
  echo
  echo "${BOLD}${CYAN}==> [${STEP}/${TOTAL_STEPS}] $*${RESET}"
}
info()    { echo "${DIM}    $*${RESET}"; }
success() { echo "${GREEN}    ✓ $*${RESET}"; }
warn()    { echo "${YELLOW}    ! $*${RESET}"; }
fail()    { echo "${RED}    ✗ $*${RESET}" >&2; exit 1; }

on_error() {
  local line=$1
  echo
  echo "${RED}${BOLD}Setup failed at line ${line}.${RESET} Fix the issue above and re-run ./install.sh — it's safe to re-run from scratch." >&2
}
trap 'on_error $LINENO' ERR

# Run a command with root privileges, whether we're already root or not.
run_priv() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

# apt-get, fully non-interactive — no debconf prompts, and no needrestart
# dialog asking which services to restart after installing packages.
apt_get() {
  run_priv env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get "$@"
}

banner() {
  echo "${BOLD}${BLUE}"
  if command -v figlet >/dev/null 2>&1; then
    figlet -f standard "Pathly"
  else
    cat <<'EOF'
 ____       _   _     _
|  _ \ __ _| |_| |__ | |_   _
| |_) / _` | __| '_ \| | | | |
|  __/ (_| | |_| | | | | |_| |
|_|   \__,_|\__|_| |_|_|\__, |
                        |___/
EOF
  fi
  echo "${RESET}${DIM}    Open-source LMS — VPS installer${RESET}"
  echo
}

banner

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------

step "Installing system packages"

if ! command -v apt-get >/dev/null 2>&1; then
  fail "This installer targets Debian/Ubuntu (apt-get not found). Install Node.js 20+, git, and PM2 manually, then run this script's later steps by hand."
fi

apt_get update -qq
apt_get install -y -qq curl git ca-certificates figlet >/dev/null
success "curl, git, ca-certificates, figlet installed"

# ---------------------------------------------------------------------------
# 2. Node.js
# ---------------------------------------------------------------------------

step "Checking Node.js"

node_major() { node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/'; }

if command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge "$NODE_MAJOR_MIN" ] 2>/dev/null; then
  success "Node.js $(node -v) already installed"
else
  info "Installing Node.js ${NODE_MAJOR_MIN}.x via NodeSource…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR_MIN}.x" | run_priv env DEBIAN_FRONTEND=noninteractive bash - >/dev/null
  apt_get install -y -qq nodejs >/dev/null
  success "Node.js $(node -v) installed"
fi

# ---------------------------------------------------------------------------
# 3. PM2
# ---------------------------------------------------------------------------

step "Checking PM2"

if command -v pm2 >/dev/null 2>&1; then
  success "PM2 already installed"
else
  run_priv npm install -g pm2 >/dev/null
  success "PM2 installed"
fi

# ---------------------------------------------------------------------------
# 4. Clone or update the repo
# ---------------------------------------------------------------------------

step "Fetching the repository into ${INSTALL_DIR}"

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Existing checkout found — pulling latest main"
  git -C "$INSTALL_DIR" fetch origin main
  git -C "$INSTALL_DIR" checkout main
  git -C "$INSTALL_DIR" pull --ff-only origin main
  success "Repository updated"
elif [ -e "$INSTALL_DIR" ]; then
  fail "${INSTALL_DIR} exists and isn't a git checkout. Remove it or set INSTALL_DIR to a different path."
else
  run_priv mkdir -p "$(dirname "$INSTALL_DIR")"
  run_priv git clone --quiet "$REPO_URL" "$INSTALL_DIR"
  run_priv chown -R "$(id -u):$(id -g)" "$INSTALL_DIR"
  success "Cloned to ${INSTALL_DIR}"
fi

cd "$INSTALL_DIR"

# ---------------------------------------------------------------------------
# 5. Install dependencies
# ---------------------------------------------------------------------------

step "Installing dependencies (npm ci)"
npm ci --no-audit --no-fund
success "Dependencies installed"

# ---------------------------------------------------------------------------
# 6. Configure environment variables
# ---------------------------------------------------------------------------

step "Configuring Supabase environment variables"

ENV_FILE="$INSTALL_DIR/.env.local"
CONFIGURE_ENV=true

if [ -f "$ENV_FILE" ]; then
  read -r -p "    An .env.local already exists — keep it as-is? [Y/n] " keep_env
  if [[ ! "$keep_env" =~ ^[Nn]$ ]]; then
    CONFIGURE_ENV=false
    success "Keeping existing .env.local"
  fi
fi

if [ "$CONFIGURE_ENV" = true ]; then
  echo
  info "Grab these from your Supabase project's Settings → API page."
  read -r -p "    Supabase Project URL (https://xxxx.supabase.co): " supabase_url
  read -r -p "    Supabase anon public key: " supabase_anon_key
  read -r -s -p "    Supabase service_role key (input hidden): " supabase_service_key
  echo

  [ -n "$supabase_url" ] || fail "Supabase Project URL is required"
  [ -n "$supabase_anon_key" ] || fail "Supabase anon key is required"
  [ -n "$supabase_service_key" ] || fail "Supabase service_role key is required"

  cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_SUPABASE_URL=${supabase_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabase_anon_key}
SUPABASE_SERVICE_ROLE_KEY=${supabase_service_key}
EOF
  chmod 600 "$ENV_FILE"
  success "Wrote .env.local (permissions locked to 600)"
fi

# ---------------------------------------------------------------------------
# 7. Build
# ---------------------------------------------------------------------------

step "Building the app"
npm run build
success "Build complete"

# ---------------------------------------------------------------------------
# 8. Start with PM2
# ---------------------------------------------------------------------------

step "Starting with PM2 on port ${PORT}"

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env >/dev/null
  success "Restarted existing PM2 process '${PM2_APP_NAME}'"
else
  pm2 start npm --name "$PM2_APP_NAME" -- start -- -H 0.0.0.0 -p "$PORT" >/dev/null
  success "Started PM2 process '${PM2_APP_NAME}'"
fi

pm2 save >/dev/null

STARTUP_CMD="$(pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null | tail -n1 || true)"
if [[ "$STARTUP_CMD" == sudo* ]]; then
  if eval "$STARTUP_CMD" >/dev/null 2>&1; then
    success "PM2 will start on boot"
  else
    warn "Couldn't enable PM2 on boot automatically — run 'pm2 startup' yourself to see the command"
  fi
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo
echo "${BOLD}${GREEN}"
if command -v figlet >/dev/null 2>&1; then
  figlet -f standard "All set!"
else
  echo "=== All set! ==="
fi
echo "${RESET}"

echo "${BOLD}Pathly is running on port ${PORT} under PM2 (process: ${PM2_APP_NAME}).${RESET}"
echo
echo "${BOLD}Next steps:${RESET}"
echo
echo "  1. ${BOLD}Apply the database schema${RESET} — this script doesn't do it for you."
echo "     Open your Supabase project's SQL Editor and run each file below, in order:"
for f in "$INSTALL_DIR"/supabase/migrations/*.sql; do
  echo "       - $(basename "$f")"
done
echo
echo "  2. ${BOLD}Point your reverse proxy at this app${RESET} (Nginx Proxy Manager, etc.):"
echo "       Forward Hostname/IP:  ${HOST_IP:-<this-server-ip>}"
echo "       Forward Port:         ${PORT}"
echo "       Enable SSL (Let's Encrypt) + Force SSL in your proxy's UI."
echo
echo "  3. ${BOLD}Sign up${RESET} through the site and create your organization."
echo
echo "  4. ${BOLD}Seed the superadmin allowlist${RESET} (only takes effect after those accounts"
echo "     have signed up) by running this in the Supabase SQL Editor:"
echo "       insert into public.superadmins (id, email)"
echo "       select id, email from auth.users"
echo "       where email in ('matteo@opus-host.de', 'benjamin@opus-host.de')"
echo "       on conflict (id) do nothing;"
echo
echo "${DIM}Useful commands: pm2 logs ${PM2_APP_NAME} | pm2 restart ${PM2_APP_NAME} | pm2 status${RESET}"
echo "${DIM}To update later, just re-run this script — it pulls, rebuilds, and restarts.${RESET}"
echo
