# Agentic Software Engineering Starter

Minimal Python workspace for building and testing software-engineering agents.

## What's included

- `src/agentic_se/agents`: agent roles and interfaces
- `src/agentic_se/tools`: tool abstractions and registry
- `src/agentic_se/memory`: lightweight memory model/store
- `src/agentic_se/workflows`: orchestration workflow
- `prompts/`: prompt templates
- `tests/`: baseline tests

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
cp .env.example .env

```
## Run

```bash
agentic-se "Create API endpoint for tasks" --dry-run
```

## Dev tasks

```bash
ruff check .
ruff format .
pytest
mypy src
```

## Make shortcuts

```bash
make setup
make test
make lint
make run TASK="Initialize CI pipeline"
```

## Backlog workspace

All product and engineering planning artifacts should live under `backlog/`:

- `backlog/epics/`
- `backlog/stories/`
- `backlog/tasks/`
- `backlog/tracking/`
- `backlog/architecture/`
- `backlog/research/`

Use markdown files in these folders for ongoing planning, delivery tracking, architecture decisions, and research notes.

