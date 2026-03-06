PYTHON ?= python3
VENV ?= .venv
ACTIVATE = . $(VENV)/bin/activate
TASK ?= Initialize CI pipeline

.PHONY: setup test lint format typecheck run

setup:
	$(PYTHON) -m venv $(VENV)
	$(ACTIVATE) && pip install -e .[dev]

test:
	$(ACTIVATE) && pytest

lint:
	$(ACTIVATE) && ruff check .

format:
	$(ACTIVATE) && ruff format .

typecheck:
	$(ACTIVATE) && mypy src

run:
	$(ACTIVATE) && agentic-se "$(TASK)" --dry-run
