import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Workout, WorkoutExercise } from '../types';

export function listWorkouts(signal?: AbortSignal): Promise<Workout[]> {
  return apiGet<Workout[]>('/workouts', signal);
}

export function getWorkout(id: string, signal?: AbortSignal): Promise<Workout> {
  return apiGet<Workout>(`/workouts/${id}`, signal);
}

export function createWorkout(
  name: string,
  date: string,
  exercises: WorkoutExercise[],
  status: 'planned' | 'active' = 'active',
): Promise<Workout> {
  return apiPost<Workout>('/workouts/', { name, date, exercises, status });
}

export function startWorkout(id: string): Promise<Workout> {
  return apiPost<Workout>(`/workouts/${id}/start`, {});
}

export function updateWorkout(id: string, exercises: WorkoutExercise[]): Promise<Workout> {
  return apiPatch<Workout>(`/workouts/${id}`, { exercises });
}

export function completeWorkoutApi(id: string, exercises: WorkoutExercise[]): Promise<Workout> {
  return apiPost<Workout>(`/workouts/${id}/complete`, { exercises });
}

export function generateWorkout(goal: string): Promise<Workout> {
  return apiPost<Workout>('/workouts/generate', { goal });
}

export function deleteWorkout(id: string): Promise<void> {
  return apiDelete(`/workouts/${id}`);
}

export function adjustWorkout(id: string, instruction: string): Promise<Workout> {
  return apiPost<Workout>(`/workouts/${id}/adjust`, { instruction });
}
