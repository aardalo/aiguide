#!/bin/bash
# Script to run E2E tests in Docker
# Usage: ./scripts/test-e2e-docker.sh

set -e

echo "🐳 Starting E2E test environment with Docker..."

# Check if we need sudo for docker
DOCKER_CMD="docker"
DOCKER_COMPOSE_CMD="docker-compose"
if ! docker ps >/dev/null 2>&1; then
  echo "⚠️  Docker requires sudo - using sudo for docker commands"
  DOCKER_CMD="sudo docker"
  DOCKER_COMPOSE_CMD="sudo docker-compose"
fi

# Clean up previous test artifacts
echo "🧹 Cleaning previous test results..."
rm -rf playwright-report test-results

# Build and run tests
echo "🏗️  Building Docker images..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml build

echo "🚀 Starting services and running tests..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml up --abort-on-container-exit --exit-code-from e2e-tests

# Capture exit code
EXIT_CODE=$?

# Clean up containers
echo "🧹 Cleaning up containers..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml down -v

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ E2E tests passed!"
else
  echo "❌ E2E tests failed with exit code $EXIT_CODE"
  echo "📊 Check playwright-report/index.html for details"
fi

exit $EXIT_CODE
