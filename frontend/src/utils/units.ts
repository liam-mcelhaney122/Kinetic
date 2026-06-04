export const LBS_PER_KG = 2.20462;
export type WeightUnit = 'kg' | 'lbs';

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? Math.round(kg * LBS_PER_KG * 10) / 10 : kg;
}

export function displayToKg(val: number, unit: WeightUnit): number {
  return unit === 'lbs' ? val / LBS_PER_KG : val;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${kgToDisplay(kg, unit)} ${unit}`;
}
