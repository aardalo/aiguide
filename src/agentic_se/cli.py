from __future__ import annotations

from typing import Annotated

import typer

from agentic_se.config import get_settings
from agentic_se.workflows.software_engineering import run_engineering_workflow

app = typer.Typer(help="Agentic software engineering CLI")


@app.command("run")
def run_task(
    task: Annotated[str, typer.Argument(help="Task for the engineering agent")],
    dry_run: Annotated[bool, typer.Option(help="Print plan only without external calls")] = True,
) -> None:
    settings = get_settings()
    result = run_engineering_workflow(task=task, model=settings.model_name, dry_run=dry_run)
    typer.echo(result)


if __name__ == "__main__":
    app()
