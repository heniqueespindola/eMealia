import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOUTUBE_API_KEY           = Deno.env.get('YOUTUBE_API_KEY')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  const { channel_id } = await req.json();
  if (!channel_id) {
    return new Response(JSON.stringify({ error: 'channel_id em falta' }), { status: 400 });
  }

  // channels.list custa 1 unidade/chamada — muito mais barato que search.list
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id:   channel_id,
    key:  YOUTUBE_API_KEY,
  });
  const res  = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) {
    return new Response(JSON.stringify({ error: 'canal não encontrado na YouTube API' }), { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('creators')
    .update({
      nome:          channel.snippet.title,
      avatar_url:    channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url,
      numero_videos: Number(channel.statistics.videoCount ?? 0),
      cached_at:     new Date().toISOString(),
    })
    .eq('channel_id', channel_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
