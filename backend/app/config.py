from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    rate_limit_default: str = "120/minute"
    rate_limit_generate: str = "10/minute"
    rate_limit_dev_login: str = "5/minute"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
