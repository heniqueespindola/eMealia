import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Preenche video_cache.creator_channel_id, substituindo o "processo externo
// fora deste repo" que a spec original assumia (nunca chegou a existir —
// ver thoughts/shared/plans/2026-07-30-criadores-em-destaque.md, secção
// "Notas de Implementação"). Sem isto, o perfil de um criador nunca mostra
// vídeos e a notificação de "novo vídeo" (trigger em video_cache) nunca
// dispara para vídeos de criadores.
//
// Invocação:
//   { "channel_id": "UC..." }  -> sincroniza só esse criador
//   {} ou sem body             -> sincroniza TODOS os creators da tabela
//                                  (é isto que o pg_cron chama diariamente)
const YOUTUBE_API_KEY           = Deno.env.get('YOUTUBE_API_KEY')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;

const MAX_VIDEOS_POR_CRIADOR = 10;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

// "PT1H2M10S" -> "1:02:10" / "PT4M5S" -> "4:05"
function parseDuracao(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = Number(m?.[1] ?? 0);
  const min = Number(m?.[2] ?? 0);
  const s = Number(m?.[3] ?? 0);
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${ss}`;
  return `${min}:${ss}`;
}
// Sincroniza os vídeos recentes de UM criador: descobre a playlist de
// uploads do canal (1 unidade), lista os vídeos recentes dessa playlist
// (1 unidade), e busca duração+views desses vídeos (1 unidade, até 50
// ids por chamada) — 3 unidades no total, bastante abaixo das 100
// unidades que o search.list (usado em youtube-feed) custa.
async function syncCanal(channelId: string): Promise<{ channel_id: string; videos_sincronizados: number; erro?: string }> {
  const channelParams = new URLSearchParams({
    part: 'snippet,contentDetails',
    id:   channelId,
    key:  YOUTUBE_API_KEY,
  });
  const channelRes  = await fetch(`https://www.googleapis.com/youtube/v3/channels?${channelParams}`);
  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];
  if (!channel) {
    return { channel_id: channelId, videos_sincronizados: 0, erro: 'canal não encontrado na YouTube API' };
  }

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  const nomeCanal = channel.snippet?.title ?? channelId;
  if (!uploadsPlaylistId) {
    return { channel_id: channelId, videos_sincronizados: 0, erro: 'canal sem playlist de uploads' };
  }

  const playlistParams = new URLSearchParams({
    part:       'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(MAX_VIDEOS_POR_CRIADOR),
    key:        YOUTUBE_API_KEY,
  });
  const playlistRes  = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`);
  const playlistData = await playlistRes.json();
  const items = (playlistData.items ?? []) as any[];
  if (items.length === 0) {
    return { channel_id: channelId, videos_sincronizados: 0 };
  }

  const videoIds = items.map((i) => i.snippet.resourceId.videoId).join(',');
  const videosParams = new URLSearchParams({
    part: 'contentDetails,statistics',
    id:   videoIds,
    key:  YOUTUBE_API_KEY,
  });
  const videosRes  = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videosParams}`);
  const videosData = await videosRes.json();
  const detalhesPorId = new Map(
    ((videosData.items ?? []) as any[]).map((v) => [v.id, v])
  );

  const rows = items.map((item) => {
    const videoId  = item.snippet.resourceId.videoId;
    const detalhes = detalhesPorId.get(videoId);
    return {
      youtube_id:          videoId,
      titulo:              item.snippet.title,
      canal:               nomeCanal,
      thumbnail_url:       item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? null,
      duracao:             detalhes?.contentDetails?.duration ? parseDuracao(detalhes.contentDetails.duration) : null,
      views:               Number(detalhes?.statistics?.viewCount ?? 0),
      publicado_em:        item.snippet.publishedAt,
      creator_channel_id:  channelId,
      cached_at:           new Date().toISOString(),
      // filtros/ingredientes_chave: sem classificação automática — ficam
      // '{}' (default da tabela) e continuam a ser curados à mão, como já
      // acontecia antes desta function existir.
    };
  });

  const { error } = await supabaseAdmin
    .from('video_cache')
    .upsert(rows, { onConflict: 'youtube_id' });

  if (error) {
    return { channel_id: channelId, videos_sincronizados: 0, erro: error.message };
  }
  return { channel_id: channelId, videos_sincronizados: rows.length };
}

serve(async (req) => {
  let channelId: string | undefined;
  try {
    const body = await req.json();
    channelId = body?.channel_id;
  } catch {
    // body vazio (ex: chamada do pg_cron) -> sincroniza todos os criadores
  }

  if (channelId) {
    const resultado = await syncCanal(channelId);
    return new Response(JSON.stringify(resultado), {
      status: resultado.erro ? 404 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: creators, error } = await supabaseAdmin.from('creators').select('channel_id');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const resultados = [];
  for (const creator of creators ?? []) {
    resultados.push(await syncCanal(creator.channel_id));
  }

  return new Response(JSON.stringify({ ok: true, criadores_sincronizados: resultados.length, resultados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
