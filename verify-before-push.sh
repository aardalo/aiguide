#!/bin/bash

# Pre-push verification script
# Runs all checks that CI will run, locally
# Usage: ./verify-before-push.sh

set -e

echo "🔍 Running pre-push verification..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to run check
run_check() {
  local name="$1"
  local command="$2"
  
  echo -n "📋 $name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((PASS++))
  else
    echo -e "${RED}✗${NC}"
    echo "   Running: $command"
    eval "$command"
    ((FAIL++))
  fi
}

# Navigate to web directory
if [ ! -d "web" ]; then
  echo -e "${RED}Error: web/ directory not found${NC}"
  echo "Run this script from the repository root"
  exit 1
fi

cd web

echo "📦 Environment: Node $(node --version), npm $(npm --version)"
echo ""

# Type checking
run_check "TypeScript (type-check)" "npm run type-check"

# Linting
run_check "ESLint (linting)" "npm run lint"

# Unit tests
run_check "Vitest (unit tests)" "npm test -- --run"

# Build verification
run_check "Next.js build" "npm run build"

# Optional: E2E tests (can be skipped with --skip-e2e)
if [[ "$1" != "--skip-e2e" ]]; then
  echo ""
  echo "🧪 E2E Tests (optional - can be slow)"
  echo -n "   Run E2E tests? (y/n): "
  read -r response
  
  if [[ "$response" =~ ^[Yy]$ ]]; then
    run_check "Playwright (E2E tests)" "npm run test:e2e:docker"
  else
    echo "   ⊘ Skipped E2E tests"
  fi
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "═══════════════════════════════════════"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✨ All checks passed!${NC}"
  echo ""
  echo "Ready to push? Run:"
  echo "  git push origin feature/TASK-XXX-description"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  echo ""
  echo "Fix errors above and run again:"
  echo "  ./verify-before-push.sh"
  echo ""
  exit 1
fi
