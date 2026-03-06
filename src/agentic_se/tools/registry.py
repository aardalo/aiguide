from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolSpec:
    name: str
    purpose: str


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def list_tools(self) -> list[ToolSpec]:
        return list(self._tools.values())
