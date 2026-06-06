import json
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_cors() -> str:
    return "http://localhost:5173,http://127.0.0.1:5173"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    log_json: bool = True

    mongo_uri: str
    mongo_db: str = "kinetic"

    clerk_jwks_url: str = ""
    clerk_audience: str = ""

    mcp_dev_secret: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Stored as a plain string to avoid pydantic-settings JSON-decoding issues.
    # Accepts either a JSON array ("[\"url1\",\"url2\"]") or a comma-separated
    # string ("url1,url2"). Use the `cors_origins` property to get the list.
    cors_origins_raw: str = Field(
        default_factory=_default_cors,
        alias="cors_origins",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins as a list, accepting JSON arrays or CSV strings."""
        raw = self.cors_origins_raw.strip()
        if raw.startswith("["):
            return json.loads(raw)
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    rate_limit_default: str = "120/minute"
    rate_limit_generate: str = "10/minute"
    rate_limit_dev_login: str = "5/minute"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
