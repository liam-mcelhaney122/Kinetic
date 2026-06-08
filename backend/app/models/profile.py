from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    unit: str = Field(default="lbs", pattern="^(kg|lbs)$")
    custom_instructions: str = Field(default="", max_length=1000)
    openai_model: str = Field(default="")


class ProfileResponse(ProfileUpdate):
    pass
