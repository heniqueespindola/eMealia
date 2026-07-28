import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

function extractMacros(info: any) {
  const nutrients = info.nutrition?.nutrients;
  if (!nutrients) return null;
  const find = (name: string) => nutrients.find((n: any) => n.name === name)?.amount ?? 0;
  return {
    calorias:  Math.round(find('Calories')),
    proteinas: Math.round(find('Protein')),
    hidratos:  Math.round(find('Carbohydrates')),
    gorduras:  Math.round(find('Fat')),
  };
}

serve(async (req) => {
  const { recipeId } = await req.json();

  if (!recipeId || !/^\d+$/.test(String(recipeId))) {
    return new Response(
      JSON.stringify({ ingredientes: [], error: 'recipeId inválido — só receitas Spoonacular têm ingredientes estruturados' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `spoonacular:ingredients:v2:${recipeId}`;
  const cached = await redis.get<{ ingredientes: { nome: string; quantidade: string | null }[]; macros: ReturnType<typeof extractMacros> }>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({ includeNutrition: 'true', apiKey: SPOONACULAR_API_KEY });
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
  const macros = extractMacros(data);

  await redis.set(cacheKey, { ingredientes, macros }, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ ingredientes, macros }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
