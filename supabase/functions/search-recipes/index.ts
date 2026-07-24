import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

const FILTRO_DISHTYPE_MAP: Record<string, string> = {
  dessert:   'sobremesa',
  breakfast: 'pequeno_almoco',
};

function mapFiltros(info: any): string[] {
  const filtros: string[] = [];
  if (info.vegan) filtros.push('vegan');
  else if (info.vegetarian) filtros.push('vegetariano');
  if (info.glutenFree) filtros.push('sem_gluten');
  if (info.dairyFree) filtros.push('sem_lactose');
  if (typeof info.readyInMinutes === 'number' && info.readyInMinutes <= 30) filtros.push('rapida');
  for (const dishType of info.dishTypes ?? []) {
    const mapped = FILTRO_DISHTYPE_MAP[dishType];
    if (mapped && !filtros.includes(mapped)) filtros.push(mapped);
  }
  return filtros;
}

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
  const { ingredients, filtros = [], number = 10 } = await req.json();

  if (!ingredients?.length) {
    return new Response(JSON.stringify({ error: 'ingredients obrigatório' }), { status: 400 });
  }

  const cacheKey = `spoonacular:search:${[...ingredients].sort().join(',')}:${[...filtros].sort().join(',')}:${number}`;

  const cached = await redis.get<any[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ results: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const findParams = new URLSearchParams({
    ingredients:  ingredients.join(','),
    number:       String(number),
    ranking:      '1',
    ignorePantry: 'false',
    apiKey:       SPOONACULAR_API_KEY,
  });
  const findRes  = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${findParams}`);
  const findData = await findRes.json();

  if (!Array.isArray(findData) || findData.length === 0) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bulkParams = new URLSearchParams({
    ids:              findData.map((r: any) => r.id).join(','),
    includeNutrition: 'true',
    apiKey:           SPOONACULAR_API_KEY,
  });
  const bulkRes  = await fetch(`https://api.spoonacular.com/recipes/informationBulk?${bulkParams}`);
  const bulkData = await bulkRes.json();
  const infoById = new Map((bulkData as any[]).map((info) => [info.id, info]));

  const results = findData.map((r: any) => {
    const info = infoById.get(r.id);
    return {
      id:                    String(r.id),
      titulo:                r.title,
      thumbnail_url:         r.image,
      source_url:            info?.sourceUrl ?? null,
      tempo_minutos:         info?.readyInMinutes ?? null,
      macros:                info ? extractMacros(info) : null,
      filtros:               info ? mapFiltros(info) : [],
      ingredientes_usados:   r.usedIngredients.map((i: any) => i.name),
      ingredientes_em_falta: r.missedIngredients.map((i: any) => i.name),
      total_ingredientes:    r.usedIngredientCount + r.missedIngredientCount,
    };
  });

  const filtered = filtros.length > 0
    ? results.filter((res: any) => filtros.every((f: string) => res.filtros.includes(f)))
    : results;

  await redis.set(cacheKey, filtered, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ results: filtered }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
