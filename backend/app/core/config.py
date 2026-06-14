from __future__ import annotations

import json
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "OrbitGuard API"
    version: str = "0.1.0"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "ORBITGUARD_ENVIRONMENT"),
    )
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        validation_alias=AliasChoices("ORBITGUARD_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    project_root: str | None = Field(
        default=None, validation_alias="ORBITGUARD_PROJECT_ROOT"
    )
    celestrak_timeout_s: float = Field(
        default=8.0, validation_alias="ORBITGUARD_CELESTRAK_TIMEOUT_S"
    )
    log_level: str = Field(default="INFO", validation_alias="ORBITGUARD_LOG_LEVEL")
    json_logs: bool = Field(default=False, validation_alias="ORBITGUARD_JSON_LOGS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        # Accept "a,b,c" or a JSON array string, so ops can set a simple env value.
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value


settings = Settings()
