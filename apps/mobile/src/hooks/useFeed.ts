import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { VideoItem, FiltroDietetico } from '@emealia/types';

export function useFeed(filtro?: FiltroDietetico) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeed() {
      setLoading(true);
      let query = supabase
        .from('video_cache')
        .select('*')
        .order('views', { ascending: false })
        .limit(20);

      if (filtro) {
        query = query.contains('filtros', [filtro]);
      }

      const { data, error } = await query;
      if (error) setError(error.message);
      else setVideos(data as VideoItem[]);
      setLoading(false);
    }

    fetchFeed();
  }, [filtro]);

  return { videos, loading, error };
}
