import { apiGet, apiPatch } from './client';
import type { WeightUnit } from '../utils/units';

export interface UserProfile {
  unit: WeightUnit;
  custom_instructions: string;
}

export function getProfile(signal?: AbortSignal): Promise<UserProfile> {
  return apiGet<UserProfile>('/profile', signal);
}

export function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiPatch<UserProfile>('/profile', data);
}
