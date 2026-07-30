import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;
const SPOONACULAR_API_KEY       = Deno.env.get('SPOONACULAR_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

async function sugerirReceita(ingredientes: string[]): Promise<string | null> {
  const cacheKey = `spoonacular:daily-suggestion:${[...ingredientes].sort().join(',')}`;

  const cached = await redis.get<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    ingredients:  ingredientes.join(','),
    number:       '1',
    ranking:      '1',
    ignorePantry: 'false',
    apiKey:       SPOONACULAR_API_KEY,
  });
  const res  = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params}`);
  const data = await res.json();

  const titulo = Array.isArray(data) && data.length > 0 ? data[0].title as string : null;
  await redis.set(cacheKey, titulo, { ex: CACHE_TTL_SECONDS });
  return titulo;
}

serve(async (_req) => {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null)
    .filter('notificacoes_prefs->>sugestoes_jantar', 'eq', 'true');

  const messages: { to: string; sound: string; title: string; body: string }[] = [];

  for (const profile of profiles ?? []) {
    const { data: pantryItems } = await supabaseAdmin
      .from('pantry_items')
      .select('nome')
      .eq('user_id', profile.id);

    const ingredientes = (pantryItems ?? []).map((i) => i.nome);
    if (ingredientes.length === 0) continue;

    const titulo = await sugerirReceita(ingredientes);
    if (!titulo) continue;

    messages.push({
      to:    profile.expo_push_token,
      sound: 'default',
      title: 'Sugestão de jantar',
      body:  `Hoje podes cozinhar: ${titulo}`,
    });
  }

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
