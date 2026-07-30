---
data: 2026-07-28
feature: "Contagem de Macros Avançada (F10)"
status: completo
---

# Research: Contagem de Macros Avançada

## Questão de Pesquisa
Onde e como guardar os objectivos nutricionais do utilizador (extensão de `profiles` vs. tabela dedicada), se compensa persistir totais diários de macros para suportar histórico semanal/mensal, como reaproveitar a lógica de macros já existente de F09 sem a duplicar, e onde encaixa este dashboard na navegação existente.

## Sumário
F09 (planeamento semanal) já resolveu o cálculo de macros diários a partir de `meal_plan` (`usePlannerMacros` + `useRecipeMacros`, com fetch/cache via a Edge Function `recipe-ingredients`). A flag `PLANS[plano].features.macros` já existe em `@emealia/config` e já está `true` para os dois planos Premium — a gate de acesso está pronta a usar. Falta criar: (1) armazenamento dos objectivos nutricionais (não existe nenhum campo de peso/altura/actividade/objectivo nem tabela de metas), (2) um mecanismo de histórico (hoje os totais são calculados em runtime no cliente e nunca persistidos), e (3) os componentes visuais de progresso/gráfico de barras e o ecrã/entrada de navegação (não existe ainda nenhum bar chart na codebase).

## Ficheiros Relevantes da Codebase

- `apps/mobile/src/hooks/usePlannerMacros.ts` — calcula totais de macros por dia da semana em vista, a partir de `MealPlanItem[]` + `SavedRecipe[]`; usa `saved_recipes.macros` quando disponível, senão chama `fetchMacros(recipe_id)` só para receitas `fonte === 'spoonacular'`, com cache em `useRef<Map>` (cache só dura enquanto o componente está montado, não persiste). Marca `parcial: true` quando algum slot não tem macros disponíveis (ex: vídeo YouTube/TikTok/Instagram sem dados estruturados). **Este é o núcleo de lógica a reutilizar, não duplicar.**
- `apps/mobile/src/hooks/useRecipeMacros.ts` — wrapper simples que invoca a Edge Function `recipe-ingredients` e devolve `data.macros`.
- `apps/mobile/src/components/planner/DayMacroBar.tsx` — hoje é só texto ("X kcal" + `Badge` "parcial" quando incompleto), **não é um gráfico de barras**. Não dá para reaproveitar visualmente para o requisito "gráfico de barras com progresso por macro" — só a lógica de dados por trás é reutilizável.
- `apps/mobile/app/(tabs)/planner.tsx:22-31` — padrão de acesso Premium a seguir: `const podeAceder = profile ? PLANS[profile.plano].features.<flag> : false`, depois `<PremiumLock mensagem="..." />` quando `!podeAceder`. F10 deve usar a flag `macros` (já existe, ver abaixo).
- `apps/mobile/app/(tabs)/profile.tsx` — ecrã de perfil actual: mostra plano, renovação, botão de upgrade/gerir subscrição, restaurar compras. Usa `useProfile(user?.id)` e `PLANS[profile.plano]`. Candidato natural a alojar o link/entrada para o dashboard de macros, ou a albergar directamente o formulário de objectivos (peso/altura/actividade/objectivo), já que é onde vivem hoje os outros dados de perfil.
- `apps/mobile/app/(tabs)/_layout.tsx` — define os 6 tabs actuais (`index`, `search`, `favoritos`, `pantry`, `planner`, `profile`). Não há tab livre óbvio — a decisão de adicionar um 7º tab vs. ecrã acessível a partir de `profile.tsx`/`planner.tsx` (ex: botão "Ver dashboard de macros") fica em aberto para o `/plan`.
- `apps/mobile/src/hooks/useProfile.ts` + `apps/mobile/src/stores/profileStore.ts` — leitura do perfil com cache em store Zustand; `getProfile`/`updateProfile` (ver abaixo) são as funções Supabase usadas.
- `apps/mobile/src/constants/planner.ts` — `segundaFeiraDaSemana()`, `adicionarSemanas()`, `formatarIntervaloSemana()` já resolvem navegação entre semanas (Segunda-feira como início, cálculo local sem lib externa). Reutilizável directamente para a vista de histórico semanal.
- `apps/mobile/src/components/paywall/PremiumLock.tsx` — componente de bloqueio já usado por F09 (e presumivelmente F07 export); aceita prop `mensagem`. Reutilizável tal e qual.

## Padrões de Implementação Existentes

**Gate de feature Premium (planner.tsx):**
```tsx
const podeAceder = profile ? PLANS[profile.plano].features.planeamento_semanal : false;
...
{!podeAceder ? (
  <PremiumLock mensagem="O planeamento semanal de refeições é uma funcionalidade Premium. Faz upgrade para desbloquear." />
) : (
  // conteúdo real
)}
```
Para F10, trocar `planeamento_semanal` por `macros` (`PLANS[profile.plano].features.macros` já existe e já está correctamente configurado por plano — ver `packages/config/src/index.ts:19-49`).

**Cálculo de macros por dia (usePlannerMacros.ts) — a reaproveitar/estender:**
```ts
const savedMap = new Map(savedRecipes.map((r) => [r.recipe_id, r.macros]));
for (const item of items) {
  let macros = savedMap.get(item.recipe_id) ?? null;
  if (!macros && item.fonte === 'spoonacular') {
    macros = cacheRef.current.get(item.recipe_id) ?? await fetchMacros(item.recipe_id);
  }
  // soma em porDia[item.dia_semana].totais, marca parcial se macros===null
}
```
Esta lógica está acoplada a `dia_semana` (0-6) de **uma única semana**. Para histórico multi-semana, ou se generaliza este hook para aceitar itens de várias `semana_inicio` agrupando por `(semana_inicio, dia_semana)`, ou se cria um hook irmão que itera sobre várias semanas chamando a mesma lógica de resolução de macros por item.

**Query de leitura/escrita de perfil (packages/supabase/src/queries/profile.ts):**
```ts
export async function getProfile(client, userId) {
  return client.from('profiles').select('*').eq('id', userId).single();
}
export async function updateProfile(client, userId, updates: Partial<Profile>) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```
`updateProfile` já é genérico via `Partial<Profile>` — se os campos de objectivo (peso, altura, actividade, objectivo, e os 4 alvos diários calculados) forem adicionados à interface `Profile` (`packages/types/src/user.ts`) e à tabela `profiles`, o formulário de objectivos pode gravar directamente com `updateProfile`, sem nova função de query.

**Query de leitura de `meal_plan` por semana (packages/supabase/src/queries/meal_plan.ts):**
```ts
export async function getMealPlanSemana(client, userId, semanaInicio) {
  return client.from('meal_plan').select('*').eq('user_id', userId).eq('semana_inicio', semanaInicio).order('dia_semana');
}
```
Só filtra por uma `semana_inicio` de cada vez. Para histórico (semanas/meses anteriores), será preciso uma nova query com filtro por intervalo de datas (`.gte('semana_inicio', ...).lte('semana_inicio', ...)`) ou iterar `getMealPlanSemana` por cada semana do período — a decidir em `/plan` consoante a abordagem de persistência de histórico escolhida.

## Tabelas/Queries Supabase Relevantes

**`profiles`** (`supabase/schema.sql`) — não tem nenhum campo relacionado com objectivos nutricionais hoje:
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id, nome, email, avatar_url, filtros_dieteticos, plano, revenuecat_id,
  gdpr_consent, gdpr_consent_at, frequencia_cozinha, onboarding_completo, created_at
);
```
RLS: `USING (auth.uid() = id)` — já cobre qualquer novo campo adicionado a esta tabela via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, sem trabalho extra de RLS.

**`meal_plan`** — única fonte de refeições planeadas; não guarda macros nem totais, só `recipe_id`/`titulo`/`fonte` por slot (dia+momento). Constraint `UNIQUE (user_id, semana_inicio, dia_semana, momento)` garante um slot por combinação.

**`saved_recipes`** — tem `macros jsonb` já preenchido para receitas guardadas via Spoonacular; é a fonte "grátis" (sem pedido à API) de macros usada primeiro por `usePlannerMacros`.

**Não existe hoje:**
- Nenhuma tabela/coluna de objectivos nutricionais (peso, altura, nível de actividade, objectivo, metas calculadas de calorias/proteínas/hidratos/gorduras).
- Nenhuma tabela de histórico/totais diários persistidos — os totais são sempre recalculados em runtime a partir de `meal_plan` + `saved_recipes`/Edge Function.

**Padrão de migration usado no projecto:** `supabase/schema.sql` é idempotente e incremental — novas colunas em tabelas existentes são adicionadas ao fim do bloco da tabela com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` (ver exemplos já existentes: `pantry_items.categoria`, `saved_recipes.tempo_minutos`). Uma nova tabela segue o mesmo padrão `CREATE TABLE IF NOT EXISTS` + `ENABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` / `CREATE POLICY ... USING (auth.uid() = user_id)`, tal como `meal_plan`/`shopping_list`. Qualquer tabela ou coluna nova para F10 deve seguir este mesmo padrão e seria adicionada ao `supabase/schema.sql` existente.

**`packages/types/src/database.ts`** — define `Database['public']['Tables']` para tipagem do cliente Supabase (`Row`/`Insert`/`Update` por tabela, com `Simplify<T>`). Qualquer tabela nova (ex: `macro_daily_totals`) ou extensão de `Profile` precisa de entrada correspondente aqui para manter o cliente tipado, seguindo o padrão das tabelas existentes.

## APIs Externas Relevantes

**Spoonacular — macros por receita** (`supabase/functions/recipe-ingredients/index.ts`):
- Endpoint: `GET https://api.spoonacular.com/recipes/{id}/information?includeNutrition=true`
- Extrai `Calories`, `Protein`, `Carbohydrates`, `Fat` de `nutrition.nutrients`, arredondados
- Cache Redis (Upstash) com chave `spoonacular:ingredients:v2:{recipeId}`, TTL 3600s (1h, conforme obrigatório pelos termos de uso já documentados no `CLAUDE.md`)
- Só aceita `recipeId` numérico (validação `/^\d+$/`) — receitas de vídeo (YouTube/TikTok/Instagram) não têm este caminho e ficam sempre `parcial: true` nos totais
- Chave `SPOONACULAR_API_KEY` só no servidor (Edge Function), nunca no cliente — já conforme a regra do `CLAUDE.md`

Não é necessária nenhuma chamada nova à Spoonacular para F10 — os totais diários continuam a vir da mesma Edge Function/hook já usados por F09. A única potencial chamada adicional seria se o histórico precisar de recalcular macros de receitas Spoonacular antigas que já saíram do cache Redis (TTL 1h) e não estão em `saved_recipes` — nesse caso reaproveita-se a mesma função `recipe-ingredients`, sem necessidade de endpoint novo.

## Code Snippets de Referência

**Flag Premium já pronta para F10** (`packages/config/src/index.ts:19-49`):
```ts
export const PLANS = {
  free: { features: { macros: false, /* ... */ } },
  premium_monthly: { features: { macros: true, /* ... */ } },
  premium_annual: { features: { macros: true, /* ... */ } },
} as const;
```

**Tipos de macros e perfil** (`packages/types/src/recipe.ts`, `packages/types/src/user.ts`):
```ts
export interface MacroNutrients {
  calorias: number; proteinas: number; hidratos: number; gorduras: number;
}
export interface Profile {
  id: string; nome: string | null; email: string; avatar_url: string | null;
  filtros_dieteticos: FiltroDietetico[]; plano: Plano; revenuecat_id: string | null;
  gdpr_consent: boolean; gdpr_consent_at: string | null;
  frequencia_cozinha: number | null; onboarding_completo: boolean; created_at: string;
  // ← nenhum campo de objectivo nutricional ainda
}
```

**Utilitários de semana já existentes** (`apps/mobile/src/constants/planner.ts`) — reutilizáveis directamente na vista de histórico semanal/mensal para navegar entre períodos sem reescrever lógica de datas.

## Questões em Aberto

1. **Onde guardar objectivos nutricionais** — estender `profiles` com colunas (`peso`, `altura`, `nivel_actividade`, `objectivo`, `meta_calorias`, `meta_proteinas`, `meta_hidratos`, `meta_gorduras`) seguindo o padrão de `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, ou criar tabela dedicada `macro_goals` (1:1 com `profiles`)? A tabela `profiles` já cresce organicamente por `ALTER TABLE` incremental (ver `categoria`, `tempo_minutos`), o que favorece continuar o mesmo padrão em vez de uma tabela nova — mas fica para decisão em `/plan`.
2. **Persistência de histórico** — `usePlannerMacros` só calcula para a semana em vista, sem gravar nada. Para "histórico semanal e mensal" (critério do ticket), decidir entre: (a) recalcular em runtime por cada `semana_inicio` do período pedido, reutilizando `getMealPlanSemana` + a lógica de `usePlannerMacros` generalizada, aceitando o custo de possíveis chamadas à Edge Function para receitas Spoonacular fora do cache Redis; ou (b) persistir totais diários numa nova tabela (ex: `macro_daily_totals`) actualizada sempre que `meal_plan` muda. A opção (a) não requer schema novo nem lógica de sincronização, mas pode ficar lenta/cara para períodos longos (Spoonacular + Redis já mitigam algo). Falta decidir em `/plan`.
3. **Fórmula de cálculo dos objectivos diários** a partir de peso/altura/actividade/objectivo (ex: Mifflin-St Jeor + factor de actividade + ajuste percentual por objectivo de perda/ganho) — não há nenhuma fórmula ou constante já definida no projecto; fica por especificar em `/plan`.
4. **Onde encaixa o ecrã na navegação** — 6 tabs já preenchem `(tabs)/_layout.tsx`; não há tab óbvio livre. Opções: novo 7º tab, secção dentro de `profile.tsx`, ou ecrã acessível a partir de `planner.tsx` (já mostra macros do dia). Fica por decidir em `/plan`.
5. **Componente de gráfico de barras** — não existe nenhum componente de bar chart/progress bar na codebase (`DayMacroBar.tsx` é só texto). Vai ter de ser construído de raiz, provavelmente com `react-native-svg` (já na stack) ou `View`s dimensionadas por percentagem — a abordagem concreta fica para `/plan`.
6. **Alerta de desvio calórico** — não existe hoje nenhum mecanismo de alerta/regra de negócio deste tipo no código (nem local nem via notificação). Confirmar em `/plan` se o alerta é puramente visual (calculado no cliente ao carregar o histórico) ou se precisa de alguma lógica no servidor/Edge Function.
