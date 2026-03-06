# E2E Testing with Docker

This document describes how to run end-to-end tests using Docker on the remote development server.

## Why Docker for E2E Tests?

Running Playwright E2E tests requires:
- Chromium browser with system dependencies (~50+ packages)
- Display server or headless environment
- Clean, reproducible test environment

Docker provides all dependencies pre-installed in the official Playwright image.

## Architecture

```
┌─────────────────────────────────────┐
│  Docker Compose Network             │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ PostgreSQL  │  │  E2E Tests   │ │
│  │   :5432     │◄─┤  Next.js     │ │
│  │             │  │  Playwright  │ │
│  └─────────────┘  └──────────────┘ │
│                          │          │
│                          ▼          │
│                   Test Reports      │
└─────────────────────────────────────┘
```

## Setup (One-Time)

Docker and Docker Compose are already installed on the remote server.

### Build Docker Image

```bash
npm run test:e2e:docker:build
```

This builds the E2E test image with all Playwright dependencies (~2-3 minutes first time, cached after).

## Running E2E Tests

### Quick Run (Recommended)

```bash
npm run test:e2e:docker
```

This script:
1. Cleans previous test results
2. Builds Docker images
3. Starts PostgreSQL database
4. Runs Prisma migrations
5. Starts Next.js dev server
6. Executes all 16 E2E tests
7. Generates HTML report
8. Cleans up containers

### Manual Control

**Start services**:
```bash
npm run test:e2e:docker:up
```

**Stop and clean up**:
```bash
npm run test:e2e:docker:down
```

**Rebuild after code changes**:
```bash
npm run test:e2e:docker:build
```

## Test Results

After running tests, reports are available:

- **HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/` directory
- **Screenshots**: Captured on failure

View HTML report:
```bash
npx playwright show-report
```

## Test Coverage

### Trip Management - Full CRUD Flow (7 tests)
- Create trip and display in list
- View trip details
- Delete trip with confirmation
- Cancel deletion
- Persist trips after page reload
- Handle multiple trips

### Trip Form Validation (6 tests)
- Show validation errors for missing required fields
- Validate date range (stop >= start)
- Allow same start and end date
- Enforce title max length (200 characters)
- Enforce description max length (1000 characters)
- Clear validation errors when corrected

### Navigation and UI Interactions (3 tests)
- Navigate between Create and My Trips tabs
- Navigate from list to detail and back
- Auto-switch to list view after creating trip

## Troubleshooting

### Tests fail with "connection refused"

The database might not be ready. The docker-compose setup includes health checks, but if issues persist:

```bash
# Restart with fresh database
npm run test:e2e:docker:down
npm run test:e2e:docker
```

### "EADDRINUSE: address already in use"

Another process is using port 5432 or 3000:

```bash
# Check what's using the ports
sudo lsof -i :5432
sudo lsof -i :3000

# Stop conflicting services
sudo systemctl stop postgresql  # if system PostgreSQL is running
```

### Slow first run

First build downloads Playwright image (~500MB). Subsequent runs use cache and are fast.

### Clean everything

```bash
# Remove all test containers and volumes
docker-compose -f docker-compose.e2e.yml down -v --rmi all

# Remove test artifacts
rm -rf playwright-report test-results
```

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e:docker
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Development Workflow

**Typical workflow:**

1. Write/modify E2E tests in `tests/e2e/trip-crud.spec.ts`
2. Run tests: `npm run test:e2e:docker`
3. Review failures in HTML report
4. Fix code and repeat

**For rapid iteration:**

Use native Playwright (if system deps installed):
```bash
npm run test:e2e
```

For final validation, always use Docker to match CI/CD environment.

## Notes

- **Database**: Each test run uses a fresh PostgreSQL instance
- **Isolation**: Tests run in parallel by default
- **Retries**: 2 retries on failure (CI mode)
- **Timeout**: 30 seconds per test
- **Browser**: Chromium (headless)

## Files

- `Dockerfile.e2e` - E2E test image definition
- `docker-compose.e2e.yml` - Service orchestration
- `scripts/test-e2e-docker.sh` - Test runner script
- `playwright.config.ts` - Playwright configuration
- `tests/e2e/trip-crud.spec.ts` - E2E test suite (16 tests)
