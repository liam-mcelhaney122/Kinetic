import { apiGet } from './client';
import type { Exercise } from '../types';

export function listExercises(signal?: AbortSignal): Promise<Exercise[]> {
  return apiGet<Exercise[]>('/exercises/', signal);
}
