import { useEffect, useState } from 'react';
import { listWorkouts } from '../api/workouts';
import type { Workout } from '../types';

interface UseWorkoutsResult {
  data: Workout[] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useWorkouts(): UseWorkoutsResult {
  const [data, setData] = useState<Workout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listWorkouts(controller.signal)
      .then((workouts) => {
        const sorted = [...workouts].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setData(sorted);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshKey]);

  return { data, loading, error, refresh: () => setRefreshKey((k) => k + 1) };
}
