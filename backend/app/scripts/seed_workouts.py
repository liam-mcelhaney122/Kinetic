#!/usr/bin/env python3
"""
seed_workouts.py — Seeds 1 year of bro-split workout history into the Kinetic API.

Usage:
    python -m app.scripts.seed_workouts [--url http://localhost:8000]
"""
import argparse
import random
import sys
from datetime import date, timedelta

import requests

SPLIT = {
    "Chest": [
        {"name": "Barbell Bench Press", "desc": "Flat barbell bench press",        "base": 135, "gain": 2.5,  "sets": 4, "reps": 8},
        {"name": "Incline DB Press",    "desc": "Incline dumbbell press",           "base": 60,  "gain": 1.25, "sets": 3, "reps": 10},
        {"name": "Cable Fly",           "desc": "Cable crossover chest fly",        "base": 40,  "gain": 0.5,  "sets": 3, "reps": 12},
        {"name": "Dips",               "desc": "Weighted parallel bar dips",       "base": 0,   "gain": 0.75, "sets": 3, "reps": 10},
        {"name": "Chest Press Machine", "desc": "Machine chest press",              "base": 100, "gain": 1.25, "sets": 3, "reps": 12},
    ],
    "Back": [
        {"name": "Barbell Row",         "desc": "Bent-over barbell row",            "base": 115, "gain": 2.5,  "sets": 4, "reps": 8},
        {"name": "Pull-Up",             "desc": "Weighted pull-up",                 "base": 0,   "gain": 0.75, "sets": 3, "reps": 8},
        {"name": "Lat Pulldown",        "desc": "Cable lat pulldown",               "base": 100, "gain": 1.25, "sets": 3, "reps": 10},
        {"name": "Seated Cable Row",    "desc": "Seated cable row",                 "base": 100, "gain": 1.25, "sets": 3, "reps": 10},
        {"name": "Face Pull",           "desc": "Cable face pull for rear delts",   "base": 40,  "gain": 0.5,  "sets": 3, "reps": 15},
    ],
    "Shoulders": [
        {"name": "Overhead Press",      "desc": "Standing barbell overhead press",  "base": 95,  "gain": 1.25, "sets": 4, "reps": 8},
        {"name": "Lateral Raise",       "desc": "Dumbbell lateral raise",           "base": 20,  "gain": 0.5,  "sets": 3, "reps": 15},
        {"name": "Front Raise",         "desc": "Dumbbell front raise",             "base": 20,  "gain": 0.5,  "sets": 3, "reps": 12},
        {"name": "Rear Delt Fly",       "desc": "Rear delt dumbbell fly",           "base": 20,  "gain": 0.5,  "sets": 3, "reps": 15},
        {"name": "Arnold Press",        "desc": "Arnold dumbbell press",            "base": 40,  "gain": 0.75, "sets": 3, "reps": 10},
    ],
    "Arms": [
        {"name": "Barbell Curl",        "desc": "Standing barbell bicep curl",      "base": 65,  "gain": 1.25, "sets": 3, "reps": 10},
        {"name": "Hammer Curl",         "desc": "Neutral-grip dumbbell curl",       "base": 35,  "gain": 0.75, "sets": 3, "reps": 12},
        {"name": "Tricep Pushdown",     "desc": "Cable tricep pushdown",            "base": 60,  "gain": 1.25, "sets": 3, "reps": 12},
        {"name": "Skull Crusher",       "desc": "EZ-bar skull crusher",             "base": 65,  "gain": 1.25, "sets": 3, "reps": 10},
        {"name": "Preacher Curl",       "desc": "EZ-bar preacher curl",             "base": 55,  "gain": 1.25, "sets": 3, "reps": 10},
    ],
    "Legs": [
        {"name": "Barbell Squat",       "desc": "Back barbell squat",               "base": 155, "gain": 2.5,  "sets": 4, "reps": 8},
        {"name": "Romanian Deadlift",   "desc": "Barbell Romanian deadlift",        "base": 135, "gain": 2.5,  "sets": 3, "reps": 10},
        {"name": "Leg Press",           "desc": "Machine leg press",                "base": 200, "gain": 5.0,  "sets": 3, "reps": 12},
        {"name": "Leg Curl",            "desc": "Lying or seated leg curl machine", "base": 70,  "gain": 1.25, "sets": 3, "reps": 12},
        {"name": "Calf Raise",          "desc": "Standing calf raise",              "base": 100, "gain": 2.5,  "sets": 4, "reps": 15},
    ],
}

DAY_ORDER = ["Chest", "Back", "Shoulders", "Arms", "Legs"]


def round_to_nearest(value: float, increment: float = 2.5) -> float:
    return round(round(value / increment) * increment, 2)


def ensure_exercises(base_url: str) -> dict[str, str]:
    resp = requests.get(f"{base_url}/exercises")
    resp.raise_for_status()
    existing = {ex["name"]: ex["_id"] for ex in resp.json()}

    ids: dict[str, str] = {}
    for muscle in DAY_ORDER:
        for ex in SPLIT[muscle]:
            name = ex["name"]
            if name in existing:
                ids[name] = existing[name]
                print(f"  [exists]  {name}")
            else:
                r = requests.post(f"{base_url}/exercises", json={"name": name, "desc": ex.get("desc")})
                r.raise_for_status()
                ids[name] = r.json()["_id"]
                print(f"  [created] {name}")
    return ids


def build_exercises(muscle: str, week: int, exercise_ids: dict[str, str], rng: random.Random) -> list[dict]:
    exercises = []
    for ex in SPLIT[muscle]:
        raw_weight = ex["base"] + week * ex["gain"]
        noise = rng.uniform(0.95, 1.05)
        weight = round_to_nearest(max(0.0, raw_weight * noise))

        sets = []
        for _ in range(ex["sets"]):
            reps = max(1, ex["reps"] + rng.randint(-1, 1))
            sets.append({"weight": weight, "reps": reps})

        exercises.append({
            "exercise_id": exercise_ids[ex["name"]],
            "name": ex["name"],
            "sets": sets,
        })
    return exercises


def seed(base_url: str) -> None:
    print("=== Ensuring exercises exist ===")
    exercise_ids = ensure_exercises(base_url)
    print(f"\nTotal exercises: {len(exercise_ids)}\n")

    start = date(2025, 6, 2)  # Monday — start of 52-week window
    rng = random.Random(42)   # Fixed seed for reproducibility

    print("=== Creating workouts ===")
    total = 0
    for week in range(52):
        for day_idx, muscle in enumerate(DAY_ORDER):
            workout_date = start + timedelta(weeks=week, days=day_idx)
            exercises = build_exercises(muscle, week, exercise_ids, rng)

            create_resp = requests.post(f"{base_url}/workouts", json={
                "name": f"{muscle} Day",
                "date": workout_date.isoformat(),
                "exercises": exercises,
            })
            if not create_resp.ok:
                print(f"  ERROR creating {workout_date}: {create_resp.text}", file=sys.stderr)
                continue
            workout_id = create_resp.json()["_id"]

            complete_resp = requests.post(f"{base_url}/workouts/{workout_id}/complete", json={
                "exercises": exercises,
            })
            if not complete_resp.ok:
                print(f"  ERROR completing {workout_id}: {complete_resp.text}", file=sys.stderr)
                continue

            total += 1
            print(f"  [{total:03d}] {workout_date}  {muscle} Day  (week {week + 1})")

    print(f"\nDone! Created and completed {total} workouts.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed 1 year of bro-split workouts into Kinetic.")
    parser.add_argument("--url", default="http://localhost:8000", help="Kinetic API base URL")
    args = parser.parse_args()

    try:
        r = requests.get(f"{args.url}/health", timeout=5)
        r.raise_for_status()
    except Exception as e:
        print(f"Cannot reach API at {args.url}: {e}", file=sys.stderr)
        sys.exit(1)

    seed(args.url)


if __name__ == "__main__":
    main()
