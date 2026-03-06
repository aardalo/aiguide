from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AgentRole:
    name: str
    responsibility: str


PLANNER = AgentRole(name="planner", responsibility="Break requests into executable steps")
IMPLEMENTER = AgentRole(name="implementer", responsibility="Apply code changes safely")
REVIEWER = AgentRole(name="reviewer", responsibility="Validate changes and quality")
