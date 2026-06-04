import { useEffect, useState } from 'react';
import { listExercises } from '../api/exercises';
import type { Exercise } from '../types';

interface UseExercisesResult {
  data: Exercise[] | null;
  loading: boolean;
  error: Error | null;
}

export function useExercises(): UseExercisesResult {
  const [data, setData] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listExercises(controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { data, loading, error };
}
