from datetime import date as Date  # noqa: N812
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExerciseCreate(BaseModel):
    name: str
    desc: str | None = None
    svg: str | None = None


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    name: str
    desc: str | None = None
    svg: str | None = None
    created_at: datetime


class PRSet(BaseModel):
    weight: float
    reps: int


class PRResponse(BaseModel):
    exercise_id: str
    name: str
    pr: PRSet | None
    workout_id: str | None = None
    date: Date | None = None
