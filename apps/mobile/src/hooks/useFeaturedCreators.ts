import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getFeaturedCreators } from '@emealia/supabase';
import type { Creator } from '@emealia/types';

export function useFeaturedCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getFeaturedCreators(supabase!).then(({ data, error }) => {
      if (error) setError(error.message); else setCreators(data ?? []);
      setLoading(false);
    });
  }, []);

  return { creators, loading, error };
}
