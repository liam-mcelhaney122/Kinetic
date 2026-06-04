import { useEffect, useState } from 'react';
import { getWorkout } from '../api/workouts';
import type { Workout } from '../types';

interface UseWorkoutResult {
  data: Workout | null;
  loading: boolean;
  error: Error | null;
}

export function useWorkout(id: string): UseWorkoutResult {
  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getWorkout(id, controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  return { data, loading, error };
}
