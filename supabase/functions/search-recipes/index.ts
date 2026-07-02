import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const REDIS_URL           = Deno.env.get('REDIS_URL')!;
const CACHE_TTL_SECONDS   = 3600; // 1 hora — obrigatório por ToS Spoonacular

serve(async (req) => {
  const { ingredients, filtros = [], number = 10 } = await req.json();

  if (!ingredients?.length) {
    return new Response(JSON.stringify({ error: 'ingredients obrigatório' }), { status: 400 });
  }

  const cacheKey = `spoonacular:${ingredients.sort().join(',')}:${filtros.join(',')}`;

  // TODO: verificar cache Redis antes de chamar Spoonacular
  // const cached = await redis.get(cacheKey);
  // if (cached) return new Response(cached);

  const params = new URLSearchParams({
    ingredients: ingredients.join(','),
    number:      String(number),
    ranking:     '1',
    ignorePantry:'true',
    apiKey:      SPOONACULAR_API_KEY,
  });

  const res  = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params}`);
  const data = await res.json();

  // TODO: guardar em cache Redis com TTL
  // await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
