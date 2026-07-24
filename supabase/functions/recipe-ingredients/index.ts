import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

serve(async (req) => {
  const { recipeId } = await req.json();

  if (!recipeId || !/^\d+$/.test(String(recipeId))) {
    return new Response(
      JSON.stringify({ ingredientes: [], error: 'recipeId inválido — só receitas Spoonacular têm ingredientes estruturados' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `spoonacular:ingredients:${recipeId}`;
  const cached = await redis.get<{ nome: string; quantidade: string | null }[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ ingredientes: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({ includeNutrition: 'false', apiKey: SPOONACULAR_API_KEY });
  const res = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?${params}`);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[recipe-ingredients] Spoonacular respondeu ${res.status}:`, errorBody);
    return new Response(
      JSON.stringify({ ingredientes: [], error: `Spoonacular API error (${res.status})` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await res.json();
  const ingredientes = (data.extendedIngredients ?? []).map((i: any) => ({
    nome:       i.name as string,
    quantidade: i.amount != null && i.unit ? `${i.amount} ${i.unit}`.trim() : null,
  }));

  await redis.set(cacheKey, ingredientes, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ ingredientes }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
