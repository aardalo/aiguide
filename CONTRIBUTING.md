# Contributing Guide

**Last Updated**: March 2, 2026

Thank you for contributing to Trip Planner! This guide will help you get started.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Testing Requirements](#testing-requirements)
4. [Code Style](#code-style)
5. [Commit Messages](#commit-messages)
6. [Pull Requests](#pull-requests)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Initial Setup (30 minutes)

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/trip-planner.git
   cd trip-planner
   ```

2. **Follow the First Run Checklist**
   ```bash
   cd web
   # Follow steps in FIRST-RUN-CHECKLIST.md
   ```

3. **Verify setup**
   ```bash
   npm run type-check && npm run lint && npm test
   ```

---

## Development Workflow

### Creating a Feature Branch

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/TASK-XXX-short-description

# Example:
# git checkout -b feature/TASK-001-add-map-component
```

### Branch Naming Convention

```
feature/TASK-XXX-description      # New features
fix/TASK-XXX-description          # Bug fixes
docs/TASK-XXX-description         # Documentation
refactor/TASK-XXX-description     # Refactoring
```

### Daily Development

```bash
# Start development server
npm run dev

# In another terminal, run tests in watch mode
npm test -- --watch

# Before committing
npm run lint
npm run type-check
npm test
npm run build
```

---

## Testing Requirements

### Unit Tests

**Required for all code changes:**

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- schemas.test.ts

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

**Guidelines**:
- Test each module independently
- Use descriptive test names
- Aim for >80% code coverage
- Mock external dependencies

### E2E Tests

**Required for UI/API changes:**

```bash
# Run E2E tests locally
npm run test:e2e

# Run E2E tests in Docker (matches CI environment)
npm run test:e2e:docker

# Update test if intentional UI changes
# Tests files: tests/e2e/*.spec.ts
```

**Guidelines**:
- Update E2E tests if modifying user-facing behavior
- Use explicit waits instead of sleeps
- Test user workflows, not implementation details
- Screenshots/traces auto-captured on failure

### Type Checking

```bash
# Check TypeScript errors
npm run type-check

# Or build locally
npm run build
```

### Linting

```bash
# Check for style issues
npm run lint

# Auto-fix fixable issues
npm run format
```

---

## Code Style

### TypeScript/JavaScript

- **Framework**: Next.js 16 with TypeScript
- **Linter**: ESLint with Prettier
- **Naming**: camelCase for variables/functions, PascalCase for components

**Example**:
```typescript
// ✅ Good
export async function getTripById(id: string): Promise<Trip | null> {
  return await prisma.trip.findUnique({ where: { id } });
}

function TripForm({ onSubmit }: TripFormProps) {
  return <form onSubmit={onSubmit}>{/* ... */}</form>;
}

// ❌ Bad
export async function get_trip(id: string) {
  // ...
}

function trip_form() {
  // ...
}
```

### File Organization

```typescript
// 1. Imports (external, then internal)
import { useState } from 'react';
import { Trip } from '@/types';

// 2. Type/Interface definitions
interface Props {
  trip: Trip;
}

// 3. Component/Function definition
export function TripCard({ trip }: Props) {
  // ...
}

// 4. Exports
export default TripCard;
```

### Comments

```typescript
// Use comments for WHY, not WHAT
// ✅ Good: Explains business logic
// Trips with same start/end date are day trips (no overnight)
const isDayTrip = startDate === endDate;

// ❌ Bad: Explains obvious code
// Set isDayTrip to true if dates are equal
const isDayTrip = startDate === endDate;
```

---

## Commit Messages

### Format

```
[TASK-XXX] Category: Concise description

Detailed explanation of changes (if needed).

- Bullet points for multiple changes
- Keep lines under 72 chars
- Reference issues/tickets
```

### Examples

```
[TASK-001] feat: Add map shell component

Implements basic map page with Leaflet integration.
- Add MapContainer to app/page.tsx
- Configure Tailwind CSS for map styling
- Add .env.local with MAP_API_KEY

Closes #42
```

```
[TASK-003] fix: Fix date validation in trip form

Date input was allowing dates before today.
- Update tripCreateSchema to use refine()
- Add integration test for date validation

Fixes #38
```

### Rules

- ✅ Start with `[TASK-XXX]`
- ✅ Use present tense ("Add" not "Added")
- ✅ Reference issues (e.g., "Closes #42")
- ✅ Keep subject line <50 characters
- ✅ Separate subject from body with blank line
- ❌ Don't use vague messages ("fix stuff", "update")

---

## Pull Requests

### Before Creating a PR

- [ ] Fork has latest changes from `develop`
- [ ] All tests pass: `npm test && npm run type-check`
- [ ] Code is formatted: `npm run format`
- [ ] Build succeeds: `npm run build`
- [ ] Commit messages follow format
- [ ] E2E tests updated (if UI changes)

### Creating a PR

1. **Push to your fork**
   ```bash
   git push origin feature/TASK-XXX-description
   ```

2. **Create PR on GitHub**
   - Title: `[TASK-XXX] Concise description`
   - Description: Follow template below
   - Target: `develop` branch

3. **PR Description Template**
   ```markdown
   ## Description
   Brief explanation of changes.

   ## Related Issue
   Closes #XXX

   ## Type of Change
   - [ ] Bug fix (non-breaking)
   - [ ] New feature (non-breaking)
   - [ ] Breaking change
   - [ ] Documentation update

   ## How to Test
   1. Step to reproduce
   2. Click X
   3. Verify Y

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] E2E tests added/updated
   - [ ] Manual testing completed

   ## Screenshots (if applicable)
   ![Screenshot](link)

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Ready for review
   ```

### PR Review Process

1. **Automated checks run**:
   - ✅ CI workflow (linting, type-check, unit tests)
   - ✅ E2E tests
   - ✅ Docker build

2. **Code review (human)**:
   - At least 1 approval required
   - Discuss concerns in comments
   - Address feedback with new commits

3. **Merge**:
   - All checks pass
   - Approved by maintainer
   - Use "Squash and merge" for clean history

---

## CI/CD Pipeline

### Understanding the Pipeline

**Three workflows run automatically**:

| Workflow | Trigger | Duration | Status |
|----------|---------|----------|--------|
| CI | Push/PR | 10-15 min | Required ✅ |
| E2E Tests | Push/PR | 15-20 min | Required ✅ |
| Docker | Push to main/develop | 5-10 min | Informational |

### Working with CI

**View CI status**:
- GitHub PR page shows check status
- Click "Details" to see full logs
- Artifacts available for 7 days

**Debugging CI failures**:

```bash
# Reproduce CI environment locally
CI=true NODE_ENV=production npm test

# Run E2E tests like in CI
npm run test:e2e:docker

# Check Docker build
docker build -f web/Dockerfile.e2e web/
```

**Re-running CI**:
- Push empty commit: `git commit --allow-empty -m "CI retry"`
- Or use GitHub UI: "Re-run all checks"

### CI Requirements

**Before code is merged to develop/main**:

1. ✅ All CI checks pass
2. ✅ All tests pass
3. ✅ No TypeScript errors
4. ✅ No ESLint errors
5. ✅ Build succeeds
6. ✅ E2E tests pass
7. ✅ Code review approved

---

## Troubleshooting

### Tests Failing Locally

**Problem**: Tests pass in CI but fail locally

**Solution**:
```bash
# Match CI environment
fi NODE_ENV=production npm test

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

**Problem**: Database connection errors in E2E tests

**Solution**:
```bash
# Start PostgreSQL
docker compose up -d

# Verify connection
psql postgresql://trip_planner:dev_password@localhost:5432/trip_planner_db

# Run migrations
npx prisma migrate deploy

# Retry tests
npm run test:e2e
```

### Build Errors

**Problem**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Check what's wrong
npm run type-check

# Fix imports (common issue)
# - Check `tsconfig.json` paths
# - Verify all imports are correct

# Rebuild from scratch
rm -rf .next
npm run build
```

### Git Conflicts

**Problem**: PR has merge conflicts

**Solution**:
```bash
# Update your branch
git fetch origin
git rebase origin/develop

# Resolve conflicts in editor
# After resolving all files:
git add .
git rebase --continue
git push origin feature/TASK-XXX-description --force
```

### CI Timeout

**Problem**: E2E tests timeout in CI

**Solution**:
```bash
# Increase test timeout in playwright.config.ts
timeout: 30 * 1000  // Increase from 10s

# Commit and push
git add playwright.config.ts
git commit -m "[TASK-XXX] ci: Increase E2E timeout"
git push
```

---

## Quick Reference

### Commands Checklist

Before creating a PR, run:
```bash
npm run type-check  # TypeScript validation
npm run lint       # Code quality check
npm test           # Unit tests
npm run build      # Production build
npm run test:e2e   # E2E tests (optional, CI will run)
```

### Useful Links

- **CI/CD Docs**: [CI-CD.md](../docs/CI-CD.md)
- **Development Guide**: [DEVELOPMENT.md](../web/DEVELOPMENT.md)
- **First Run**: [FIRST-RUN-CHECKLIST.md](../web/FIRST-RUN-CHECKLIST.md)
- **Backlog**: [SPRINT-001](../../backlog/tracking/)

---

## Questions?

- 📖 Check the [FAQ](../docs/FAQ.md)
- 🐛 Open an issue on GitHub
- 💬 Discuss in PR comments

Thank you for contributing! 🎉
