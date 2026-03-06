from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class MemoryItem:
    key: str
    value: str


class MemoryStore:
    def __init__(self) -> None:
        self._items: dict[str, MemoryItem] = {}

    def put(self, key: str, value: str) -> None:
        self._items[key] = MemoryItem(key=key, value=value)

    def get(self, key: str) -> str | None:
        item = self._items.get(key)
        return item.value if item else None
