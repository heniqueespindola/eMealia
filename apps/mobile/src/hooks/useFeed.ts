import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MOCK_VIDEOS } from '@/constants/mockFeed';
import type { VideoItem, FiltroDietetico } from '@emealia/types';

function countMatches(videoFiltros: FiltroDietetico[], perfilFiltros: FiltroDietetico[]): number {
  return videoFiltros.filter((f) => perfilFiltros.includes(f)).length;
}

export function useFeed(filtro?: FiltroDietetico, filtrosPerfil: FiltroDietetico[] = []) {
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
      if (error) {
        setError(error.message);
      } else {
        const baseVideos = data.length === 0
          ? MOCK_VIDEOS.filter((v) => !filtro || v.filtros.includes(filtro))
          : (data as VideoItem[]);

        const sorted = filtrosPerfil.length > 0
          ? [...baseVideos].sort((a, b) => countMatches(b.filtros, filtrosPerfil) - countMatches(a.filtros, filtrosPerfil))
          : baseVideos;

        setVideos(sorted);
      }
      setLoading(false);
    }

    fetchFeed();
  }, [filtro, filtrosPerfil.join(',')]);

  return { videos, loading, error };
}
