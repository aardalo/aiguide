#!/usr/bin/env bash
# Claude Code PostToolUse hook.
# Restarts the Next.js dev server whenever a Bash tool call runs a Prisma
# command that changes the schema or applies migrations.
#
# Claude Code delivers a JSON object on stdin:
#   { "tool_name": "Bash",
#     "tool_input": { "command": "npx prisma migrate dev ..." },
#     "tool_response": { ... } }
#
# This script always exits 0 so it never blocks Claude's workflow.

set -uo pipefail

input=$(cat 2>/dev/null || true)

# Extract the bash command that just ran
cmd=""
if command -v jq &>/dev/null; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
fi

# Restart when the command was a schema-changing Prisma operation
if printf '%s' "$cmd" | grep -qE 'prisma\s+(migrate|generate|db\s+(push|execute))'; then
  echo "[after-prisma] Prisma change detected — restarting dev server..." >&2
  /opt/web/scripts/dev-server.sh restart >&2 || true
  echo "[after-prisma] Done." >&2
fi

exit 0
