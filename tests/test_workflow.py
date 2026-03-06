from agentic_se.workflows.software_engineering import run_engineering_workflow


def test_workflow_output_includes_roles() -> None:
    output = run_engineering_workflow(
        task="Add health endpoint",
        model="gpt-5.3-codex",
        dry_run=True,
    )
    assert "planner" in output
    assert "implementer" in output
    assert "reviewer" in output
