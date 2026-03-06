from __future__ import annotations

from functools import lru_cache
from os import getenv

from dotenv import load_dotenv
from pydantic import BaseModel, Field


class Settings(BaseModel):
    model_provider: str = Field(default="openai")
    model_name: str = Field(default="gpt-5.3-codex")
    openai_api_key: str | None = Field(default=None)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_dotenv()
    return Settings(
        model_provider=getenv("MODEL_PROVIDER", "openai"),
        model_name=getenv("MODEL_NAME", "gpt-5.3-codex"),
        openai_api_key=getenv("OPENAI_API_KEY"),
    )
