from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(default="Default", max_length=64)


class ApiKeyResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    name: str
    created_at: datetime
    last_used: datetime | None = None


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Returned only at creation time — includes the raw key once."""
    raw_key: str
