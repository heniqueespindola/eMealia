import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  const { video_id, creator_channel_id } = await req.json();
  if (!creator_channel_id) {
    return new Response(JSON.stringify({ ok: true, skipped: 'sem creator_channel_id' }));
  }

  const { data: video } = await supabaseAdmin
    .from('video_cache')
    .select('titulo')
    .eq('id', video_id)
    .single();

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, nome')
    .eq('channel_id', creator_channel_id)
    .single();

  if (!creator) {
    return new Response(JSON.stringify({ ok: true, skipped: 'criador não encontrado' }));
  }

  const { data: follows } = await supabaseAdmin
    .from('followed_creators')
    .select('user_id')
    .eq('creator_id', creator.id);

  const userIds = (follows ?? []).map((f) => f.user_id);
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, notified: 0 }));
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);

  const messages = (profiles ?? [])
    .filter((p) => p.expo_push_token)
    .map((p) => ({
      to:    p.expo_push_token,
      sound: 'default',
      title: `Novo vídeo de ${creator.nome ?? 'um criador que segues'}`,
      body:  video?.titulo ?? 'Vídeo novo disponível',
    }));

  // Expo aceita até 100 mensagens por pedido
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
