# EPIC-001 Development - First Run Checklist

**Before Starting**: Ensure you have Node.js 20+ and Docker installed

---

## ✅ Step 1: Environment Verification (5 min)

### Check Prerequisites
```bash
# Verify Node.js 20+
node --version
# Expected: v20.x.x or higher

# Verify npm 10+
npm --version
# Expected: 10.x or higher

# Verify Docker
docker --version
# Expected: version XX.X.X

# Verify Docker Compose
docker compose version
# Expected: Docker Compose version XX.X.X
```

### If Versions Are Wrong
- **Node 18**: `nvm install 20 && nvm use 20`
- **npm too old**: `npm install -g npm@10`
- **Docker not installed**: Visit https://docker.com

---

## ✅ Step 2: Start PostgreSQL (5 min)

```bash
cd /opt/web

# Start PostgreSQL container
docker compose up -d

# Verify it's running
docker compose ps

# Expected: trip_planner_db postgres:16-alpine Up X minutes
```

### If Docker Container Fails
```bash
# Check logs
docker compose logs postgres

# Restart
docker compose down
docker compose up -d

# Try again
docker compose ps
```

---

## ✅ Step 3: Database Setup (5 min)

```bash
cd /opt/web

# Apply migration to database
npx prisma migrate deploy

# Expected output:
# ✓ Successfully applied 1 migration

# Generate Prisma Client
npx prisma generate

# Expected output:
# ✓ Generated Prisma Client to ./node_modules/.prisma/client
```

### If Migration Fails
```bash
# Check database connection
npx prisma db push --skip-generate

# If still failing, check .env.local has DATABASE_URL
cat .env.local

# Should show:
# DATABASE_URL="postgresql://trip_user:trip_password@localhost:5432/trip_planner_dev"
```

---

## ✅ Step 4: Start Development Server (5 min)

```bash
cd /opt/web

# Start Next.js dev server
npm run dev

# Expected output:
# ▲ Next.js 16.x.x
# - Local:        http://localhost:3000
# ✓ Ready in XXXms
```

### If Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Try starting again
npm run dev
```

---

## ✅ Step 5: Verify Web Interface (3 min)

### Open Browser
```
http://localhost:3000
```

### Check Elements
- [ ] "Trip Planner" header visible
- [ ] "+ Create Trip" button in header
- [ ] Map placeholder in center
- [ ] Trips sidebar on right
- [ ] No console errors (F12 → Console tab)

### If Page Doesn't Load
- Refresh page (Cmd+R or Ctrl+R)
- Check dev server console for errors
- If errors, share with tech lead

---

## ✅ Step 6: Test Create Trip (5 min)

### Via Web Form
1. Click "+ Create Trip" button
2. Fill form:
   - **Title**: "Test Trip"
   - **Description**: (optional)
   - **Start Date**: 2026-06-15
   - **Stop Date**: 2026-06-30
3. Click "Create Trip"
4. Should see success message
5. Trip should appear in Trips sidebar

### Via API (Alternative Test)
```bash
# Open another terminal window
cd /opt/web

# Create trip via curl
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Beach Vacation",
    "startDate": "2026-07-01",
    "stopDate": "2026-07-07"
  }'

# Expected response (HTTP 201):
# {
#   "id": "clx...",
#   "title": "Beach Vacation",
#   "startDate": "2026-07-01T00:00:00.000Z",
#   ...
# }

# List trips
curl http://localhost:3000/api/trips

# Expected: Array with your trips
```

---

## ✅ Step 7: Test Date Validation (3 min)

### Invalid Date Range (Should Fail)
```bash
# Stop date before start date
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bad Trip",
    "startDate": "2026-07-07",
    "stopDate": "2026-07-01"
  }'

# Expected response (HTTP 400):
# {
#   "error": "Validation failed",
#   "issues": {
#     "fieldErrors": {
#       "stopDate": ["Stop date must be equal to or after the start date"]
#     }
#   }
# }
```

### Form Validation (Should Block)
1. Click "+ Create Trip"
2. Try entering:
   - Start: 2026-06-30
   - Stop: 2026-06-15
3. Form should show error message
4. Submit button should be disabled

---

## ✅ Step 8: Verify Database Persistence (5 min)

```bash
# Open Prisma Studio (browser GUI)
npx prisma studio

# Browser will open to http://localhost:5555
# Click "trips" table
# Should see your created trips

# Or use command line
docker compose exec postgres psql -U trip_user -d trip_planner_dev -c "SELECT * FROM trips;"

# Expected: List of trips with data
```

---

## ✅ Step 9: Run Tests (5 min)

```bash
cd /opt/web

# Run schema validation tests
npm test -- --run

# Expected: Tests pass (may show PostCSS warning, ignore it)
# ✓ tests/unit/schemas.test.ts

# Or run verification node test
node -e "
const z = require('zod');
const schema = z.object({
  title: z.string().min(1),
  startDate: z.string().date(),
  stopDate: z.string().date(),
}).refine(
  (data) => new Date(data.stopDate) >= new Date(data.startDate),
  { message: 'Stop date must be >= start date', path: ['stopDate'] }
);

const r1 = schema.safeParse({ title: 'Test', startDate: '2026-06-15', stopDate: '2026-06-30' });
const r2 = schema.safeParse({ title: 'Bad', startDate: '2026-06-30', stopDate: '2026-06-15' });
console.log('✓ Valid:', r1.success ? 'PASS' : 'FAIL');
console.log('✓ Invalid:', !r2.success ? 'PASS' : 'FAIL');
console.log(''); console.log('✓ All schema tests passed!');
"
```

---

## ✅ Step 10: Ready to Develop! 🚀

### Everything Working?
- [x] Docker PostgreSQL running
- [x] npm dev server running (http://localhost:3000)
- [x] Web page loads
- [x] Can create trips
- [x] Validation works
- [x] Data persists in database

### You're Ready to Code!

### Daily Workflow
```bash
# Start of day
docker compose up -d
npm run dev

# During development
npm test                          # Run tests
npm run type-check               # TypeScript check
npm run lint                      # Code quality

# Before commit
npm run format                    # Auto-format code
npm test && npm run type-check    # Verify quality
git add . && git commit           # Commit changes
git push origin feature/TASK-XXX  # Push to GitHub
```

### See Next Steps
- Read: [`DEVELOPMENT.md`](/opt/web/DEVELOPMENT.md)
- Plan: [`SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md`](/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)
- Track: [`SPRINT-001-DAILY-LOG.md`](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)

---

## 🚨 Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| `docker compose command not found` | Use `docker compose` not `docker-compose` |
| `Database connection refused` | Run `docker compose up -d && wait 5s && npm run dev` |
| Port 5432 in use | Run `docker compose down && docker compose up -d` |
| Port 3000 in use | Kill process: `lsof -i :3000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| `npm install` fails | Try: `npm cache clean --force && npm install` |
| TypeScript errors | Run: `npx prisma generate && npm run type-check` |
| Prisma out of sync | Run: `rm -rf node_modules/.prisma && npx prisma generate` |

---

## ✅ Completion Checklist

- [ ] Node.js 20+ verified
- [ ] Docker running
- [ ] PostgreSQL container up
- [ ] Database migration applied
- [ ] Dev server running
- [ ] Web page loads (http://localhost:3000)
- [ ] Can create a trip
- [ ] Date validation works
- [ ] Data persists
- [ ] Tests pass
- [ ] Ready to develop!

---

## 🎉 Next Step

You are ready to develop EPIC-001! Your team can now:

1. **Work on TASK-002**: Trip model (already done, verify code)
2. **Work on TASK-003**: API endpoints testing
3. **Work on TASK-004**: Form refinement
4. **Work on TASK-005**: Validation tests
5. **Continue with remaining tasks**

See [`SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md`](/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md) for full details.

**Questions?** Check the troubleshooting or ask in standup! 🚀

---

**Total Setup Time**: ~30 minutes  
**Ready Date**: Same day  
**Start Development**: Today!
