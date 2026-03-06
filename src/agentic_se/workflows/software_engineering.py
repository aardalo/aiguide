from __future__ import annotations

from agentic_se.agents.base import IMPLEMENTER, PLANNER, REVIEWER


def run_engineering_workflow(task: str, model: str, dry_run: bool = True) -> str:
    plan = [
        f"1. {PLANNER.name}: understand task -> {task}",
        f"2. {IMPLEMENTER.name}: implement minimal focused change",
        f"3. {REVIEWER.name}: run validation and summarize",
    ]
    header = f"model={model} dry_run={str(dry_run).lower()}"
    return "\n".join([header, *plan])
