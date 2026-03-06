# CI/CD Pipeline Documentation

**Last Updated**: March 2, 2026  
**Version**: 1.0

---

## Overview

The project uses GitHub Actions for continuous integration and deployment (CI/CD). The pipeline automatically runs tests, linting, type checking, and build verification on every push and pull request.

---

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger Events**:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests targeting `main` or `develop`
- Manual trigger via `workflow_dispatch`

**Jobs**:

#### Lint & Type Check
- Runs ESLint for code quality
- TypeScript compiler for type safety
- Non-blocking (continues on error)

**Command**:
```bash
npm run lint
npx tsc --noEmit
```

#### Unit Tests
- Runs Vitest for unit testing
- Uploads coverage to Codecov
- Non-blocking (continues on error)

**Command**:
```bash
npm run test:unit
```

#### Build Verification
- Generates Prisma Client
- Builds Next.js application
- Verifies build size < 100MB
- Non-blocking (continues on error)

**Command**:
```bash
npm ci
npx prisma generate
npm run build
```

### 2. E2E Tests Workflow (`.github/workflows/e2e-tests.yml`)

**Trigger Events**:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests targeting `main` or `develop`
- Changes to E2E-related files
- Manual trigger via `workflow_dispatch`

**Setup**:
- PostgreSQL 16-Alpine service with health checks
- Node.js 20.x environment
- npm caching for faster builds

**Jobs**:

#### E2E Tests
1. Checkout code
2. Set up Node.js 20 with cached dependencies
3. Install Playwright browsers (Chromium)
4. Generate Prisma Client
5. Run database migrations
6. Build Next.js application
7. Run E2E tests with Playwright
8. Upload test reports and artifacts
9. Comment on PR with test results (if PR)

**Environment Variables**:
```bash
DATABASE_URL=postgresql://trip_planner:test_password@localhost:5432/trip_planner_db
CI=true
NODE_ENV=production
```

**Artifacts**:
- `playwright-report/` - HTML test report (7 day retention)
- `test-results/` - JSON test results (7 day retention)

**Timeout**: 20 minutes

### 3. Docker Build Workflow (`.github/workflows/docker-build.yml`)

**Trigger Events**:
- Push to `main` or `develop` when Dockerfile changes
- Manual trigger via `workflow_dispatch`

**Jobs**:

#### Build E2E Image
- Uses Docker Buildx for multi-platform builds
- Caches layers in GitHub Actions cache
- Verifies E2E Docker image builds successfully

**Note**: Currently builds locally only. Can be extended to push to Docker Hub/ECR.

---

## File Structure

```
.github/
├── workflows/
│   ├── ci.yml                    # Main CI pipeline (lint, test, build)
│   ├── e2e-tests.yml            # E2E test pipeline
│   └── docker-build.yml         # Docker image builds
```

---

## Configuration Details

### Database Service (E2E Tests)

The E2E workflow includes a PostgreSQL service:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: trip_planner
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: trip_planner_db
    options:
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**Requirements**:
- Port 5432 must be available
- Service is automatically started/stopped with workflow
- Health checks ensure readiness before tests

### Caching Strategy

**npm Cache**:
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

**Docker Cache**:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

---

## Test Execution Details

### E2E Tests in CI vs Local

| Aspect | Local | CI |
|--------|-------|-----|
| Database | Docker Compose | GitHub Service |
| Timeout | 120s (configurable) | 20m total job |
| Parallelism | 1 worker | 1 worker (configurable) |
| Node ENV | `production` | `production` |
| Retries | 2 per test | 2 per test |

### Test Results Reporting

**Playwright Report**:
- Uploaded as GitHub artifact
- Accessible for 7 days
- Can be downloaded for local analysis

**PR Comments**:
- Automatically posted on pull requests
- Shows pass/fail counts and duration
- Helps reviewers understand test impact

**Example Comment**:
```
## 🧪 E2E Test Results

- **Passed**: 15
- **Failed**: 0
- **Skipped**: 1
- **Duration**: 210s
```

---

## Status Checks

GitHub enforces these status checks on main/develop branches:

1. ✅ **CI / Lint & Type Check** - All linting passes
2. ✅ **CI / Unit Tests** - All unit tests pass
3. ✅ **CI / Build Verification** - Build succeeds
4. ✅ **E2E Tests / Run E2E Tests** - All E2E tests pass

**Pull Request Requirements**:
- All status checks must pass
- At least 1 code review approval (enforced by branch protection)
- No merge conflicts

---

## Running Tests Locally vs CI

### Local E2E Test Execution

```bash
cd web
npm run test:e2e:docker
```

**Advantages**:
- Full control and visibility
- Fast iteration during development
- Local debugging with Playwright Inspector

### CI E2E Test Execution

```bash
# Automatically triggered on push/PR
# Or manually triggered
```

**Advantages**:
- Standardized environment
- Parallel execution of independent workflows
- Automatic reporting
- Required for merge

---

## Troubleshooting CI/CD

### E2E Tests Timeout

**Error**: `The operation timed out`

**Solution**:
1. Increase workflow timeout in `.github/workflows/e2e-tests.yml`:
   ```yaml
   timeout-minutes: 30  # Increase from 20
   ```
2. Check for slow database queries
3. Verify postgres service is healthy

### Database Connection Error

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Verify postgres service is defined in workflow
2. Check health check configuration
3. Ensure `DATABASE_URL` environment variable is correct

### Build Cache Not Working

**Error**: Build takes very long on every run

**Solution**:
1. Clear GitHub Actions cache:
   ```bash
   gh actions-cache delete <cache-key> --all
   ```
2. Verify `cache-dependency-path` matches actual package-lock.json location
3. Check cache size isn't exceeding 5GB limit

### Tests Pass Locally but Fail in CI

**Possible Causes**:
1. Environment variable differences
2. Timing issues (use explicit waits)
3. Database state persistence (clear migrations)
4. File permissions (Docker vs host system)

**Solution**:
1. Match CI environment locally: `NODE_ENV=production`
2. Increase Playwright timeouts
3. Check database migrations run in CI
4. Review test traces in artifact uploads

---

## Performance Optimization

### Reduce Pipeline Runtime

**Current**: ~30-40 minutes (all workflows)

**Optimization Strategies**:

1. **Parallel Jobs**: Already implemented
   - Lint, tests, and build run simultaneously

2. **Dependency Caching**:
   - npm packages cached automatically
   - Docker layer caching enabled

3. **Early Exit**:
   - Lint before expensive builds
   - Fail fast on type errors

### Recommended Timeouts

| Job | Timeout | Reason |
|-----|---------|--------|
| Lint | 10 min | Fast operation |
| Unit Tests | 15 min | Medium load |
| Build | 20 min | Can be slow on first run |
| E2E Tests | 20 min | Browser startup + tests |

---

## Integration with Git Workflows

### Feature Branch Protection

Branch protection rules on `main` and `develop`:

```
✓ Require status checks to pass
✓ Require code review approvals (1)
✓ Require branches to be up to date
✓ Dismiss stale pull request approvals
✗ Allow force pushes
✗ Allow deletions
```

### Merge Strategy

```bash
# CI/CD automatically runs when:
1. Feature branch pushed
2. PR created against develop
3. Code review approved
4. All checks pass

# Manual merge command:
gh pr merge <PR_NUMBER> --squash
```

---

## Secrets & Environment Variables

### GitHub Secrets (if needed for deployment)

Currently no secrets are required for CI. If adding deployment:

```yaml
- name: Deploy to Staging
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
    DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
  run: npm run deploy:staging
```

### Adding Secrets

```bash
gh secret set DEPLOY_TOKEN --body "your-token"
gh secret list
```

---

## Monitoring & Alerts

### Viewing Workflow Status

**GitHub UI**:
1. Navigate to: Actions tab → Select workflow
2. Filter by branch or status
3. Click run to view logs

**Command Line**:
```bash
# List recent workflow runs
gh run list

# View specific run
gh run view <RUN_ID>

# Watch live logs
gh run watch <RUN_ID>
```

### Workflow Badges

Add to README:

```markdown
[![CI](https://github.com/your-org/repo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/your-org/repo/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/your-org/repo/actions/workflows/e2e-tests.yml/badge.svg?branch=main)](https://github.com/your-org/repo/actions/workflows/e2e-tests.yml)
```

---

## Future Enhancements

### Planned Improvements

1. **Deployment Workflows**
   - Staging deployment on `develop` merge
   - Production deployment on `main` release
   - Automated version bumping

2. **Performance Testing**
   - Lighthouse CI for web performance
   - Load testing with k6
   - Bundle analysis

3. **Security Scanning**
   - OWASP dependency check
   - SonarQube code quality
   - Container image scanning

4. **Extended Testing**
   - Visual regression testing
   - Cross-browser testing (Firefox, Safari)
   - Mobile viewport testing

5. **Notifications**
   - Slack integration for failures
   - Email digests of test results
   - Custom GitHub notifications

---

## Quick Reference

### Common Commands

```bash
# View all workflows
gh workflow list

# Disable a workflow  
gh workflow disable <WORKFLOW_ID>

# Enable a workflow
gh workflow enable <WORKFLOW_ID>

# Trigger workflow manually
gh workflow run e2e-tests.yml

# View specific workflow run details
gh run view <RUN_ID> --log
```

### Workflow Files Quick Links

- **CI**: `.github/workflows/ci.yml`
- **E2E Tests**: `.github/workflows/e2e-tests.yml`
- **Docker**: `.github/workflows/docker-build.yml`

---

## Support & Issues

For CI/CD issues:

1. Check GitHub Actions logs for detailed error messages
2. Review workflow file syntax with `gh workflow validate`
3. Test Docker build locally: `docker build -f web/Dockerfile.e2e web/`
4. Verify database connection: `psql postgresql://trip_planner:test_password@localhost:5432/trip_planner_db`

---

**Last Updated**: March 2, 2026
