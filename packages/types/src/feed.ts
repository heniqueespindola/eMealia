import type { FiltroDietetico } from './user';

export type VideoSource = 'youtube' | 'tiktok' | 'instagram' | 'emealia';

export interface VideoItem {
  id:            string;
  youtube_id:    string;
  titulo:        string;
  canal:         string;
  thumbnail_url: string;
  duracao:       string;
  views:         number;
  publicado_em:  string;
  filtros:       FiltroDietetico[];
  ingredientes_chave: string[];
  cached_at:     string;
  fonte?:        VideoSource; // ausente em video_cache (YouTube-only); presente em dados mock
}
