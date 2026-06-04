import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useProfile } from '../hooks/useProfile';
import type { WeightUnit } from '../utils/units';

interface UnitContextValue {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
}

const UnitContext = createContext<UnitContextValue>({ unit: 'lbs', setUnit: () => {} });

export function UnitProvider({ children }: { children: ReactNode }) {
  const { data } = useProfile();
  const [unit, setUnit] = useState<WeightUnit>('lbs');

  useEffect(() => {
    setUnit(data.unit);
  }, [data.unit]);

  return <UnitContext.Provider value={{ unit, setUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit(): WeightUnit {
  return useContext(UnitContext).unit;
}

export function useSetUnit(): (unit: WeightUnit) => void {
  return useContext(UnitContext).setUnit;
}
