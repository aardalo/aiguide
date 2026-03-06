#!/usr/bin/env bash
# Manage Docker services (PostgreSQL + Neo4j) for the Trip Planner project.
#
# Usage: scripts/docker-services.sh {start|stop|restart|status}
#
# All output goes to stdout as structured messages so agents can parse results.
# Exit codes: 0 = success, 1 = failure (with descriptive error message).

set -uo pipefail

PROJ="/opt/web"
COMPOSE_FILE="$PROJ/docker-compose.yml"

# ---------------------------------------------------------------------------
# Resolve docker-compose command (v2 plugin vs v1 standalone)
# ---------------------------------------------------------------------------
COMPOSE=""
if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
fi
if [ -z "$COMPOSE" ]; then
  echo "ERROR: Neither 'docker compose' nor 'docker-compose' found. Is Docker installed?"
  exit 1
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
run_compose() {
  $COMPOSE -f "$COMPOSE_FILE" "$@" 2>&1
}

check_docker_daemon() {
  if ! docker info &>/dev/null; then
    echo "ERROR: Docker daemon is not running. Start Docker and try again."
    exit 1
  fi
}

wait_for_healthy() {
  local container="$1"
  local max_attempts="${2:-30}"
  for i in $(seq 1 "$max_attempts"); do
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    case "$health" in
      healthy)  return 0 ;;
      missing)  return 1 ;;  # container doesn't exist or has no healthcheck
      *)        sleep 1 ;;
    esac
  done
  return 1
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
cmd_start() {
  check_docker_daemon

  local output
  output=$(run_compose up -d 2>&1)
  local rc=$?

  if [ $rc -ne 0 ]; then
    echo "ERROR: Failed to start Docker services (exit code $rc)."
    echo "$output"
    exit 1
  fi

  # Check each container is running
  local all_ok=true
  for container in trip_planner_db trip_planner_neo4j; do
    local state
    state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$state" != "running" ]; then
      echo "ERROR: Container $container is not running (state: $state)."
      local logs
      logs=$(docker logs --tail 20 "$container" 2>&1 || true)
      echo "Last 20 log lines from $container:"
      echo "$logs"
      all_ok=false
    fi
  done

  if [ "$all_ok" = false ]; then
    exit 1
  fi

  # Wait for PostgreSQL healthcheck
  if wait_for_healthy trip_planner_db 30; then
    echo "PostgreSQL is healthy and accepting connections."
  else
    echo "WARNING: PostgreSQL container is running but healthcheck not yet passing."
    echo "Last 10 log lines:"
    docker logs --tail 10 trip_planner_db 2>&1 || true
  fi

  echo "Docker services started: trip_planner_db (PostgreSQL :5432), trip_planner_neo4j (Neo4j :7474/:7687)."
}

cmd_stop() {
  check_docker_daemon

  local output
  output=$(run_compose stop 2>&1)
  local rc=$?

  if [ $rc -ne 0 ]; then
    echo "ERROR: Failed to stop Docker services (exit code $rc)."
    echo "$output"
    exit 1
  fi

  echo "Docker services stopped."
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  check_docker_daemon

  for container in trip_planner_db trip_planner_neo4j; do
    local state health
    state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "n/a")
    echo "$container: state=$state health=$health"
  done
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "${1:-status}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
