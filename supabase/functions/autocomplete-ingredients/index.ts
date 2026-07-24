import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

serve(async (req) => {
  const { query } = await req.json();

  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `spoonacular:autocomplete:${query.toLowerCase()}`;
  const cached = await redis.get<string[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ suggestions: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({ query, number: '8', apiKey: SPOONACULAR_API_KEY });
  const res  = await fetch(`https://api.spoonacular.com/food/ingredients/autocomplete?${params}`);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[autocomplete-ingredients] Spoonacular respondeu ${res.status}:`, errorBody);
    return new Response(
      JSON.stringify({ suggestions: [], error: `Spoonacular API error (${res.status})` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error('[autocomplete-ingredients] Resposta inesperada da Spoonacular:', JSON.stringify(data));
    return new Response(
      JSON.stringify({ suggestions: [], error: 'Resposta inesperada da Spoonacular API' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const suggestions = (data as { name: string }[]).map((i) => i.name);

  await redis.set(cacheKey, suggestions, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ suggestions }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
