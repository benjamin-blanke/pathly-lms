#!/usr/bin/env bash
#
# Pathly LMS — VPS installer
#
# Clones the repo, installs Node.js/PM2/Docker, stands up a self-hosted
# Supabase-compatible backend (Postgres + Auth + REST API, all running
# locally in Docker — no cloud account, no manual SQL, no manual key
# copying), applies the database schema, builds the app, and runs it under
# PM2. Safe to re-run: it updates an existing checkout, reapplies only new
# migrations, and restarts instead of duplicating anything.
#
# This script does NOT touch nginx/certbot — bring your own reverse proxy
# (e.g. Nginx Proxy Manager) pointed at the ports this script prints at the
# end.
#
# Usage:
#   ./install.sh
#   INSTALL_DIR=/srv/pathly PORT=3001 API_PORT=8001 ./install.sh
#
set -euo pipefail

REPO_URL="https://github.com/benjamin-blanke/pathly-lms.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/pathly-lms}"
PORT="${PORT:-3000}"
API_PORT="${API_PORT:-8000}"
PM2_APP_NAME="pathly"
NODE_MAJOR_MIN=20
TOTAL_STEPS=13
STEP=0

DOCKER_DIR=""   # set once INSTALL_DIR is known
ENV_FILE=""     # docker/.env

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

# docker compose, pinned to Pathly's backend stack file + env.
dc() {
  run_priv docker compose -f "$DOCKER_DIR/docker-compose.yml" --env-file "$ENV_FILE" "$@"
}

# Run a psql command inside the running db container.
db_psql() {
  run_priv docker exec -i pathly-db psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"
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
  fail "This installer targets Debian/Ubuntu (apt-get not found). Install Node.js 20+, git, Docker, and PM2 manually, then run this script's later steps by hand."
fi

apt_get update -qq
apt_get install -y -qq curl git ca-certificates figlet openssl >/dev/null
success "curl, git, ca-certificates, figlet, openssl installed"

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
# 4. Docker
# ---------------------------------------------------------------------------

step "Checking Docker"

if command -v docker >/dev/null 2>&1 && run_priv docker compose version >/dev/null 2>&1; then
  success "Docker $(docker --version | sed -E 's/Docker version ([0-9.]+).*/\1/') already installed"
else
  info "Installing Docker Engine + Compose plugin via get.docker.com…"
  curl -fsSL https://get.docker.com | run_priv sh >/dev/null 2>&1
  run_priv systemctl enable --now docker >/dev/null 2>&1 || true
  success "Docker installed"
fi

# ---------------------------------------------------------------------------
# 5. Clone or update the repo
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
DOCKER_DIR="$INSTALL_DIR/docker"
ENV_FILE="$DOCKER_DIR/.env"

# ---------------------------------------------------------------------------
# 6. Install dependencies
# ---------------------------------------------------------------------------

step "Installing dependencies (npm ci)"
npm ci --no-audit --no-fund
success "Dependencies installed"

# ---------------------------------------------------------------------------
# 7. Configure the backend (secrets + public API domain)
# ---------------------------------------------------------------------------

step "Configuring the self-hosted backend"

CONFIGURE_BACKEND=true
if [ -f "$ENV_FILE" ]; then
  read -r -p "    docker/.env already exists — keep it as-is? [Y/n] " keep_backend_env
  if [[ ! "$keep_backend_env" =~ ^[Nn]$ ]]; then
    CONFIGURE_BACKEND=false
    success "Keeping existing docker/.env"
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
fi

if [ "$CONFIGURE_BACKEND" = true ]; then
  echo
  info "Pathly needs one public HTTPS domain for its backend API, separate from"
  info "the app's own domain — e.g. api.yourdomain.com. Point a second proxy"
  info "host at this server for it (see the instructions printed at the end)."
  read -r -p "    Public URL for the backend API (https://api.yourdomain.com): " api_external_url
  [ -n "$api_external_url" ] || fail "The backend API's public URL is required — the browser talks to it directly."

  # GoTrue requires a full URI with a scheme (a bare domain fails to parse
  # and crash-loops the auth container) — add one if the user left it off,
  # and drop any trailing slash so it composes cleanly with appended paths.
  if [[ ! "$api_external_url" =~ ^https?:// ]]; then
    api_external_url="https://${api_external_url}"
  fi
  api_external_url="${api_external_url%/}"

  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"
  JWT_EXPIRY=3600
  API_EXTERNAL_URL="$api_external_url"
  GATEWAY_PORT="$API_PORT"

  mkdir -p "$DOCKER_DIR"
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=${JWT_EXPIRY}
API_EXTERNAL_URL=${API_EXTERNAL_URL}
GATEWAY_PORT=${GATEWAY_PORT}
EOF
  chmod 600 "$ENV_FILE"
  success "Generated database password + JWT secret, wrote docker/.env"
fi

# Mint the long-lived anon/service_role API keys (JWTs signed with
# JWT_SECRET) that supabase-js needs — the same mechanism Supabase Cloud
# uses, just signed locally instead of handed to us by a dashboard.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

mint_jwt() {
  local role="$1" iat exp header_b64 payload_b64 signature
  iat="$(date +%s)"
  exp="$((iat + 315360000))" # 10 years — these are long-lived API keys, not user sessions
  header_b64="$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | b64url)"
  payload_b64="$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$iat" "$exp" | b64url)"
  signature="$(printf '%s' "${header_b64}.${payload_b64}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)"
  printf '%s.%s.%s' "$header_b64" "$payload_b64" "$signature"
}

ANON_KEY="$(mint_jwt anon)"
SERVICE_ROLE_KEY="$(mint_jwt service_role)"

# ---------------------------------------------------------------------------
# 8. Start the backend stack
# ---------------------------------------------------------------------------

step "Starting the backend (Postgres + Auth + REST API)"

dc up -d
success "Containers started"

info "Waiting for the database to become healthy…"
db_ready=false
for _ in $(seq 1 60); do
  if [ "$(run_priv docker inspect -f '{{.State.Health.Status}}' pathly-db 2>/dev/null)" = "healthy" ]; then
    db_ready=true
    break
  fi
  sleep 2
done
[ "$db_ready" = true ] || fail "Database didn't become healthy in time — check 'docker compose -f docker/docker-compose.yml logs db'"
success "Database is healthy"

info "Waiting for Auth to become healthy…"
auth_ready=false
for _ in $(seq 1 60); do
  if [ "$(run_priv docker inspect -f '{{.State.Health.Status}}' pathly-auth 2>/dev/null)" = "healthy" ]; then
    auth_ready=true
    break
  fi
  sleep 2
done
[ "$auth_ready" = true ] || fail "Auth didn't become healthy in time — check 'docker compose -f docker/docker-compose.yml logs auth'"
success "Auth is healthy"

# ---------------------------------------------------------------------------
# 9. Apply database migrations (idempotent — only new files run)
# ---------------------------------------------------------------------------

step "Applying database migrations"

db_psql -c "create table if not exists public._pathly_migrations (filename text primary key, applied_at timestamptz not null default now());" >/dev/null

applied_any=false
for f in "$INSTALL_DIR"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  already="$(db_psql -tAc "select 1 from public._pathly_migrations where filename = '${name}';")"
  if [ "$already" = "1" ]; then
    continue
  fi
  info "Applying ${name}…"
  db_psql < "$f"
  db_psql -c "insert into public._pathly_migrations (filename) values ('${name}');" >/dev/null
  applied_any=true
done

if [ "$applied_any" = true ]; then
  success "Migrations applied"
else
  success "Database already up to date — nothing new to apply"
fi

# Re-check the superadmin allowlist every run (not just on first apply):
# these accounts only get flagged once they've actually signed up, so a
# signup that happens after the first install still needs to be caught.
db_psql -c "
  insert into public.superadmins (id, email)
  select id, email from auth.users
  where email in ('matteo@opus-host.de', 'benjamin@opus-host.de')
  on conflict (id) do nothing;
" >/dev/null

# Make sure PostgREST picks up the (possibly just-created) schema immediately.
run_priv docker exec pathly-db psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';" >/dev/null
success "Superadmin allowlist synced, schema cache reloaded"

# ---------------------------------------------------------------------------
# 10. Configure app environment variables
# ---------------------------------------------------------------------------

step "Configuring app environment variables"

APP_ENV_FILE="$INSTALL_DIR/.env.local"
cat > "$APP_ENV_FILE" <<EOF
NEXT_PUBLIC_SUPABASE_URL=${API_EXTERNAL_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF
chmod 600 "$APP_ENV_FILE"
success "Wrote .env.local pointing at the local backend"

# ---------------------------------------------------------------------------
# 11. Build
# ---------------------------------------------------------------------------

step "Building the app"
npm run build
success "Build complete"

# ---------------------------------------------------------------------------
# 12. Start with PM2
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
# 13. Done
# ---------------------------------------------------------------------------

step "Done"

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
echo "${BOLD}Its self-hosted backend (Postgres + Auth + REST API) is running in Docker on port ${GATEWAY_PORT}.${RESET}"
echo
echo "${BOLD}Next steps:${RESET}"
echo
echo "  1. ${BOLD}Point your reverse proxy at two things${RESET} (Nginx Proxy Manager, etc.):"
echo "       App:      Forward Hostname/IP ${HOST_IP:-<this-server-ip>}, Port ${PORT}  →  your main domain"
echo "       Backend:  Forward Hostname/IP ${HOST_IP:-<this-server-ip>}, Port ${GATEWAY_PORT}  →  ${API_EXTERNAL_URL}"
echo "       Enable SSL (Let's Encrypt) + Force SSL for both in your proxy's UI."
echo
echo "  2. ${BOLD}Sign up${RESET} through the site and create your organization."
echo
echo "  3. ${BOLD}Superadmins${RESET} (matteo@opus-host.de, benjamin@opus-host.de) are flagged"
echo "     automatically once they sign up — this script re-checks on every run,"
echo "     so no manual SQL is needed."
echo
echo "${DIM}Useful commands:${RESET}"
echo "${DIM}  App:      pm2 logs ${PM2_APP_NAME} | pm2 restart ${PM2_APP_NAME} | pm2 status${RESET}"
echo "${DIM}  Backend:  docker compose -f docker/docker-compose.yml logs -f${RESET}"
echo "${DIM}            docker compose -f docker/docker-compose.yml ps${RESET}"
echo "${DIM}To update later, just re-run this script — it pulls, migrates, rebuilds, and restarts.${RESET}"
echo
