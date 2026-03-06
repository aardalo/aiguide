# Agentic Software Development: Quick Reference

**7 Specialized Subagents + VS Code Agent Mode**

**Version**: 4.0 | **Date**: March 6, 2026

---

## Agent Roles Summary (v4.0)

| Agent | What it Does | Key Agent Mode Tools |
|-------|-------------|---------------------|
| Team Lead | Coordinates specialists, delegates tasks | `@workspace`, MCP servers |
| Architect | Designs data models, APIs, system architecture | `@workspace`, Database MCP |
| Backend | Implements APIs, database, business logic | `@terminal`, `@browser`, Database MCP |
| Frontend | Implements React components, state, API calls | `@browser`, Copilot Edits |
| UI/Design | Styles components, accessibility, responsive design | `@browser` (visual verification) |
| External Data | Integrates third-party APIs (MapBox, SendGrid) | `@browser`, REST Client MCP |
| Tester | Writes unit, integration, E2E tests | `@terminal`, `@browser` |

---

## VS Code Agent Mode Tools

All agents have access to these tools in VS Code agent mode:

### Core Tools
```
@workspace    → Search codebase, find symbols, navigate project
@terminal     → Execute shell commands, run builds/tests/linters
@browser      → Open URLs, interact with live pages, take screenshots
@vscode       → VS Code settings, extensions, editor commands
Copilot Edits → Multi-file editing with inline diff preview
```

### MCP Servers (Model Context Protocol)
```
Database MCP  → Inspect schema, run queries, verify migrations
Docker MCP    → Container management, health checks
GitHub MCP    → PR reviews, issue tracking, CI status
REST Client   → Test external API endpoints
```

### Copilot Extensions
```
Docker        → Container management from agent mode
Database      → Query and inspect databases
Playwright    → Run/debug E2E tests from VS Code
GitHub        → PR and issue management
```

---

## Decision Tree: Which Agent?

```
I need to...
│
├─ DESIGN a data model / API / architecture
│  → Architect (uses @workspace + Database MCP)
│
├─ IMPLEMENT server-side code (APIs, DB)
│  → Backend (uses @terminal + @browser for API testing)
│
├─ IMPLEMENT client-side code (React, state)
│  → Frontend (uses @browser to verify components)
│
├─ STYLE components / make accessible
│  → UI/Design (uses @browser for visual verification)
│
├─ INTEGRATE a third-party API
│  → External Data (uses @browser + REST Client MCP)
│
├─ WRITE tests / check coverage
│  → Tester (uses @terminal + @browser for E2E)
│
└─ COORDINATE multiple agents
   → Team Lead (uses @workspace + MCP for context)
```

---

## How to Use

### VS Code Agent Mode (Recommended)

Open Copilot Chat in agent mode (Ctrl+Shift+I):

```
# Team Lead routes automatically
Add email notifications to trip reminders

# Direct to specialist
@architect Design the trip sharing data model
@backend Implement POST /api/trips/:id/share
@frontend Build sharing dialog component
@ui-design Style the sharing dialog
@tester Write E2E tests for sharing flow
```

### Agent Mode Workflow

```
1. Describe task in Copilot Chat (agent mode)
2. Team Lead analyzes and delegates to specialists
3. Each specialist uses agent mode tools:
   - @workspace to understand codebase
   - @terminal to run commands
   - @browser to verify in live app
   - MCP servers for external context
4. Results flow back through Team Lead
5. Team Lead reports summary to user
```

### CLI

```bash
python -m agentic_se run "Your task" --role team-lead
python -m agentic_se run "Style trip form" --agent ui-design
```

---

## Typical Workflow with Agent Mode

### Feature: "Add trip sharing"

```
Step 1: Team Lead
  └─ @workspace: Find existing trip model patterns
  └─ Delegates to Architect

Step 2: Architect
  └─ @workspace: Analyze current schema
  └─ Database MCP: Inspect current tables
  └─ Delivers: TripShare model design + API contract

Step 3: Backend (parallel with External Data)
  └─ Copilot Edits: Create route handler + schema
  └─ @terminal: npx prisma migrate dev && npm run type-check
  └─ @browser: Test API with curl at localhost:3000

Step 4: Frontend + UI/Design (parallel)
  └─ Frontend: @browser verifies component renders
  └─ UI/Design: @browser checks responsive at 375px, 768px, 1920px

Step 5: Tester
  └─ @terminal: npm test -- --coverage
  └─ @browser: E2E test of sharing flow
  └─ Reports: 88% coverage, all tests pass
```

---

## Environment Variables

```bash
# Model selection
AGENT_MODEL=claude-opus-4-6            # Latest Claude model

# API access
ANTHROPIC_API_KEY=sk-ant-...           # Anthropic API key
GITHUB_TOKEN=ghp_...                   # GitHub access (optional)

# External services
SENDGRID_API_KEY=SG....               # Email integration
MAPBOX_TOKEN=pk....                    # Maps integration
```

---

## MCP Server Setup

Add to `.vscode/settings.json`:

```jsonc
{
  "mcp.servers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-postgres", "${env:DATABASE_URL}"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "${env:GITHUB_TOKEN}" }
    }
  }
}
```

---

## Key Resources

| Resource | Purpose |
|----------|---------|
| [AGENT-ROLES-AND-SETUP.md](.github/AGENT-ROLES-AND-SETUP.md) | Complete documentation |
| [prompts/](prompts/) | Agent system prompts (7 files) |
| [web/CLAUDE.md](web/CLAUDE.md) | Claude Code project instructions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Developer contribution guide |

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Agent not working | Check: `env \| grep AGENT_` |
| MCP not connecting | Verify `.vscode/settings.json` MCP config |
| Browser tool fails | Ensure dev server: `scripts/dev-server.sh status` |
| Poor output quality | Provide more context, reference specific files |
| Wrong agent delegated | Be more specific in request, mention technology |

---

**Last Updated**: March 6, 2026 | **Version**: 4.0 - Agent Mode + MCP + Browser Tools
