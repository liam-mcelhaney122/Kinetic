import { useEffect, useState } from 'react';
import { getProfile } from '../api/profile';
import type { UserProfile } from '../api/profile';

const DEFAULT_PROFILE: UserProfile = { unit: 'lbs', custom_instructions: '', openai_model: '' };

export function useProfile(): { data: UserProfile; loading: boolean; error: string | null } {
  const [data, setData] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getProfile(controller.signal)
      .then((profile) => {
        setData(profile);
        setError(null);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError(String(err));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { data, loading, error };
}
