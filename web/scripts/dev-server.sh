#!/usr/bin/env bash
# Manage the Next.js dev server for this project.
# Uses the nvm Node.js v22 that Next.js 16 requires (system node is v18).
#
# Usage: scripts/dev-server.sh {start|stop|restart|status|logs}
#
# Agents: always use this script — never run `npm run dev` or `node next dev`
# directly, as those may pick up the wrong Node.js version.

set -euo pipefail

PROJ="/opt/web"
LOG="/tmp/nextjs-dev.log"
PID_FILE="/tmp/nextjs-dev.pid"

# ---------------------------------------------------------------------------
# Resolve Node.js >=20 — required by Next.js 16
# ---------------------------------------------------------------------------
NODE=""
# 1. Check if the shell's current `node` is already new enough
if command -v node &>/dev/null; then
  _ver=$(node --version | sed 's/v//')
  _major=${_ver%%.*}
  if [ "$_major" -ge 20 ] 2>/dev/null; then
    NODE="$(command -v node)"
  fi
fi
# 2. Fall back to the known nvm location for this machine
if [ -z "$NODE" ]; then
  _candidate="/home/oyvind/.nvm/versions/node/v22.22.0/bin/node"
  if [ -x "$_candidate" ]; then
    NODE="$_candidate"
  fi
fi
# 3. Try sourcing nvm and asking for the latest v22
if [ -z "$NODE" ]; then
  export NVM_DIR="${HOME}/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  if command -v nvm &>/dev/null; then
    _candidate="$(nvm which 22 2>/dev/null || true)"
    [ -x "$_candidate" ] && NODE="$_candidate"
  fi
fi
if [ -z "$NODE" ]; then
  echo "ERROR: Cannot find Node.js >=20." >&2
  echo "Install Node 22 via nvm or update NODE= in $0." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

cmd_status() {
  if is_running; then
    echo "running (PID $(cat "$PID_FILE"), Node $("$NODE" --version))"
  else
    echo "stopped"
  fi
}

cmd_stop() {
  if is_running; then
    local pid
    pid=$(cat "$PID_FILE")
    echo "Stopping dev server (PID $pid)..." >&2
    kill "$pid" 2>/dev/null || true
    # Give workers a moment to exit, then forcefully clean up
    sleep 2
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  # Kill any lingering Next.js worker processes
  pkill -f "next-server" 2>/dev/null || true
  pkill -f "next dev"    2>/dev/null || true
  sleep 1
}

cmd_start() {
  if is_running; then
    echo "Dev server already running (PID $(cat "$PID_FILE"))" >&2
    return 0
  fi
  cd "$PROJ"
  echo "Starting Next.js dev server (Node $("$NODE" --version))..." >&2
  # Use nohup + disown so the process outlives this script
  nohup "$NODE" node_modules/.bin/next dev >> "$LOG" 2>&1 &
  local pid=$!
  disown "$pid"
  echo "$pid" > "$PID_FILE"
  echo "Dev server starting (PID $pid) — log: $LOG" >&2
  # Wait up to 30 s for the server to answer on :3000
  for i in $(seq 1 30); do
    sleep 1
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
      echo "Dev server ready at http://localhost:3000" >&2
      return 0
    fi
  done
  echo "WARNING: server not responding after 30 s — check $LOG" >&2
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "${1:-status}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status)  cmd_status ;;
  logs)    tail -f "$LOG" ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}" >&2
    exit 1
    ;;
esac
