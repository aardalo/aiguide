# Agentic Software Engineering Instructions

**Version**: 4.0 (Agent Mode + MCP + Browser Tools) | **Date**: March 6, 2026

---

## Quick Links

**START HERE**: [AGENT-ROLES-AND-SETUP.md](AGENT-ROLES-AND-SETUP.md) - Complete agent system documentation

**Specialized Subagent Prompts** (in `prompts/` directory):
- [agent_team_lead.md](../prompts/agent_team_lead.md) - Coordination & delegation
- [agent_architect.md](../prompts/agent_architect.md) - System design
- [agent_backend.md](../prompts/agent_backend.md) - Server-side implementation
- [agent_frontend.md](../prompts/agent_frontend.md) - Client-side logic
- [agent_ui_design.md](../prompts/agent_ui_design.md) - Visual design & UX
- [agent_external_data.md](../prompts/agent_external_data.md) - Third-party APIs
- [agent_tester.md](../prompts/agent_tester.md) - Testing & quality

---

## Overview

This project uses **7 specialized subagents** coordinated by a Team Lead, powered by **VS Code agent mode** with browser tools and MCP integration:

| Agent | Role | Use For |
|-------|------|---------|
| Team Lead | Coordinate & delegate | Task routing, decision making |
| Architect | Design systems | Data models, API design, tech decisions |
| Backend | Server code | APIs, database, business logic |
| Frontend | Client code | React, state, data fetching |
| UI/Design | Visual & UX | Styling, accessibility, responsiveness |
| External Data | Third-party APIs | SendGrid, MapBox, webhooks |
| Tester | Quality assurance | Unit, integration, E2E tests |

---

## VS Code Agent Mode Features (v4.0)

All agents have access to these VS Code agent mode capabilities:

### Core Agent Tools
| Tool | Description | Used By |
|------|-------------|---------|
| `@workspace` | Search codebase, find symbols, navigate project | All agents |
| `@terminal` | Execute shell commands, run builds/tests/linters | All agents |
| `@browser` | Open URLs, inspect live pages, take screenshots | Frontend, UI/Design, Tester, Reviewer |
| `@vscode` | VS Code settings, extensions, editor commands | All agents |
| **Copilot Edits** | Multi-file editing with inline diff preview | Backend, Frontend, Implementer |

### MCP Server Integration
Agents can connect to external tools via Model Context Protocol servers:

| MCP Server | Purpose | Used By |
|------------|---------|---------|
| Database | Inspect schema, run queries, verify migrations | Backend, Architect |
| Docker | Container management, health checks | DevOps, Backend |
| GitHub | PR reviews, issue tracking, CI status | Team Lead, Reviewer |
| REST Client | Test external API endpoints | External Data |

### Copilot Extensions (Plugins)
Installed VS Code extensions provide additional agent capabilities:

- **GitHub Copilot** — Code completion, chat, agent mode
- **Docker extension** — Container management from agent mode
- **Database extensions** — Query and inspect databases
- **Playwright extension** — Run/debug E2E tests from VS Code

### Agentic Browser Tools
The `@browser` tool enables agents to:
- Open the running app at `http://localhost:3000` to verify changes
- Navigate pages, click buttons, fill forms in the live app
- Take screenshots for visual verification and documentation
- Inspect network requests and console output
- Test responsive layouts at different viewport sizes

---

## Setup (5 minutes)

```bash
# 1. Install Node 22+ (required for Next.js 16) and Docker
node --version && docker --version

# 2. Create Python environment
python3 -m venv .venv && source .venv/bin/activate

# 3. Install dependencies
pip install -e .[dev]

# 4. (Optional) Configure MCP servers in VS Code settings
# Add database, Docker, or GitHub MCP servers for enhanced agent capabilities
```

---

## How to Use

### VS Code Agent Mode (Recommended)

In VS Code Copilot Chat, use **agent mode** (`@workspace` button or Ctrl+Shift+I):

```
# Team Lead routes automatically
Design the data model for trip waypoints
→ Team Lead → Architect

Implement trip CRUD API endpoints
→ Team Lead → Backend → @terminal verifies → @browser tests

Style the trip card with Tailwind
→ Team Lead → UI/Design → @browser visual check

Write tests for trip validation
→ Team Lead → Tester → @terminal runs tests
```

### Direct Specialist Requests

When you know exactly what you need:
```
@architect Design notification event system
@backend Implement trip update endpoint
@frontend Add trip search filter
@ui-design Make trip form responsive
@external-data Integrate MapBox geocoding
@tester Write E2E tests for trip creation
```

### CLI

```bash
python -m agentic_se run "Your task" --role team-lead
```

---

## Key Principles

- **Team Lead coordinates** — doesn't implement/design/test directly
- **Specialists stay in their lane** — Backend doesn't style, UI/Design doesn't write APIs
- **Use agent mode tools** — `@terminal` for verification, `@browser` for visual checks
- **MCP for external context** — Database state, CI status, GitHub issues
- **Handoffs are explicit** — Agent reports completion, next agent takes over
- **All decisions are auditable** — Track which agent did what

---

## Agent Mode Workflow Example

```
User: "Add trip sharing feature"

1. Team Lead analyzes request
   └─ Uses @workspace to understand current codebase

2. @architect designs data model
   └─ Uses @workspace to find existing patterns
   └─ Uses Database MCP to inspect current schema

3. @backend implements API
   └─ Uses Copilot Edits for multi-file changes
   └─ Uses @terminal: npm run type-check && npm test
   └─ Uses @browser: curl-tests via live API

4. @frontend builds UI components
   └─ Uses @browser to verify components render correctly

5. @ui-design styles components
   └─ Uses @browser to visually verify at 375px, 768px, 1920px

6. @tester writes comprehensive tests
   └─ Uses @terminal: npm test -- --coverage
   └─ Uses @browser for E2E test verification
```

---

## Troubleshooting

- **Agent not working?** Check: `env | grep AGENT_`
- **MCP server not connecting?** Verify configuration in VS Code settings
- **Browser tool not opening?** Ensure dev server is running: `scripts/dev-server.sh status`
- **Poor output?** Provide context, smaller tasks, reference specific files
- **Confused task?** Be more specific, link to similar code with `@workspace`

---

**For complete documentation, see**: [AGENT-ROLES-AND-SETUP.md](AGENT-ROLES-AND-SETUP.md)

**Last Updated**: March 6, 2026 | **Version**: 4.0 - Agent Mode + MCP + Browser Tools
