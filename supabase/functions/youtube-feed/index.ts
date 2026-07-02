import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const YOUTUBE_API_KEY  = Deno.env.get('YOUTUBE_API_KEY')!;
const CACHE_TTL_SECONDS = 14400; // 4 horas — YouTube search.list custa 100 unidades/chamada

serve(async (req) => {
  const { query, filtro, maxResults = 10 } = await req.json();

  // search.list custa 100 unidades — usar sempre com cache
  const params = new URLSearchParams({
    part:       'snippet',
    q:          `receitas ${query ?? ''} ${filtro ?? ''}`,
    type:       'video',
    maxResults: String(maxResults),
    relevanceLanguage: 'pt',
    key:        YOUTUBE_API_KEY,
  });

  const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
