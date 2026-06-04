from datetime import date as Date  # noqa: N812
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Set(BaseModel):
    reps: int
    weight: float
    set_type: Literal["normal", "drop"] = "normal"


class WorkoutExercise(BaseModel):
    exercise_id: str
    name: str
    sets: list[Set]
    reasoning: str = ""
    coach_note: str = ""
    superset_id: str | None = None


class WorkoutCreate(BaseModel):
    name: str
    date: Date
    exercises: list[WorkoutExercise]
    status: Literal["planned", "active"] = "planned"


class WorkoutUpdate(BaseModel):
    exercises: list[WorkoutExercise]


class WorkoutComplete(BaseModel):
    exercises: list[WorkoutExercise]


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    name: str
    date: Date
    status: Literal["planned", "active", "completed"]
    exercises: list[WorkoutExercise]
    created_at: datetime
    completed_at: datetime | None = None


class ExerciseVolume(BaseModel):
    exercise_id: str
    name: str
    volume: float


class VolumeResponse(BaseModel):
    workout_id: str
    total_volume: float
    exercises: list[ExerciseVolume]
