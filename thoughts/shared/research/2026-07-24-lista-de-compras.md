---
data: 2026-07-24
feature: "Lista de Compras Automática (F07)"
status: completo
---

# Research: Lista de Compras Automática

## Questão de Pesquisa
Como obter a lista de ingredientes de uma receita para comparação com `pantry_items` (visto que `saved_recipes`/`meal_plan` não guardam ingredientes estruturados), qual a abordagem de normalização de nomes para essa comparação, como implementar a exportação nativa para Apple Reminders (EventKit/expo-calendar) e Google Tasks API a partir de Expo, e onde encaixar o ecrã de lista de compras na navegação (`app/(tabs)/`)?

## Sumário
A tabela `shopping_list` e as RLS já existem no schema, mas **não há nenhuma fonte de ingredientes estruturados com quantidade/unidade em nenhuma tabela ou tipo actualmente em uso** — este é o bloqueio central da feature. Não existe camada de queries (`packages/supabase`) nem hook para `shopping_list` ou `meal_plan`, nem qualquer integração nativa de share/calendário no repo — é greenfield total nesse aspecto, mas há padrões claros de hooks/queries/gating a seguir (pantry, favoritos). `expo-calendar` suporta Reminders (EventKit) mas só em iOS e requer dev client; Google Tasks requer OAuth próprio separado do Supabase Auth; não há alternativa cross-platform madura.

## Ficheiros Relevantes da Codebase

- `supabase/schema.sql:112-126` — tabela `shopping_list` (id, user_id, nome, quantidade, comprado, recipe_id, created_at) e RLS `FOR ALL USING (auth.uid() = user_id)`. Já pronta a usar, sem alterações necessárias ao schema para o CRUD básico.
- `supabase/schema.sql:93-109` — tabela `meal_plan` existe no SQL mas **não está no `Database` type** (`packages/types/src/database.ts`) nem tem qualquer query ou referência no código — greenfield total para a consolidação semanal.
- `apps/mobile/src/hooks/usePantry.ts:1-53` — padrão de hook a seguir para `useShoppingList`: wrappa uma store Zustand, guarda `loadedUserId` para evitar refetch duplicado, delega Supabase a `packages/supabase`.
- `apps/mobile/src/hooks/useSavedRecipes.ts:43-62` — padrão de "mover/reatribuir" (`moveToColecao`, `deleteColecao` com reassign em lote) — modelo directo para "marcar comprado em lote" / "limpar lista".
- `packages/supabase/src/queries/pantry.ts:1-32` — forma exacta das query functions (thin wrappers sobre o query builder do Supabase, tipadas via `Database['public']['Tables'][...]`). **Não existe `packages/supabase/src/queries/shopping_list.ts`** — a criar de raiz, e exportar em `packages/supabase/src/index.ts:1-4`.
- `apps/mobile/app/(tabs)/_layout.tsx:26-31` — 6 tabs actuais: `index`, `search`, `favoritos`, `pantry`, `planner`, `profile`. Já são 6 tabs; um 7º tab dedicado ficaria apertado.
- `apps/mobile/app/(tabs)/planner.tsx:1-9` — stub de 9 linhas ("F09 — Planeamento semanal (Premium)"), sem lógica nem query a `meal_plan`. A função "gerar lista da semana" não tem UI de planner por trás ainda.
- `apps/mobile/src/components/recipe/RecipeDetailModal.tsx:1-19` — único precedente de integração com sistema externo: `Linking.openURL` (expo-linking) para abrir `source_url`. Não há `Share.share`, `expo-sharing`, `expo-calendar` nem `expo-contacts` em lado nenhum do repo.
- `apps/mobile/app/(tabs)/pantry.tsx:14,26-27,71-77,104,118` — padrão de gating por plano a seguir para bloquear a exportação Premium (ver snippet abaixo).
- `packages/types/src/recipe.ts:12-35` — mostra o mismatch: `Recipe.ingredientes: string[]` (linha 20) existe no tipo mas não é populado por nenhum código; o que a Edge Function realmente devolve é `RecipeSearchResult` (linhas 24-35), só com nomes.
- `supabase/functions/search-recipes/index.ts:79-97` — a Edge Function busca `informationBulk` da Spoonacular (que **tem** `extendedIngredients` com amount/unit) mas descarta esses dados; só extrai `usedIngredients`/`missedIngredients` como arrays de nomes (sem quantidade/unidade).
- `apps/mobile/package.json:17-32` — confirma ausência de `expo-calendar`, `expo-sharing`, `expo-contacts` ou qualquer lib de Google Sign-In nas dependências actuais.

## Padrões de Implementação Existentes

**Hook + store + query layer (a replicar para `useShoppingList`):**
```typescript
// apps/mobile/src/hooks/usePantry.ts
export function usePantry(userId: string | undefined) {
  const items = usePantryStore((s) => s.items);
  useEffect(() => {
    if (!userId) { usePantryStore.getState().reset(); return; }
    if (usePantryStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function add(item: Omit<PantryInsert, 'user_id'>) {
    const { data, error } = await addPantryItem(supabase!, { ...item, user_id: userId });
    if (data) usePantryStore.getState().addItem(data);
  }
  // ...
}
```

**Query function shape (`packages/supabase/src/queries/pantry.ts`):**
```typescript
export async function getPantry(client: SupabaseClient<Database>, userId: string) {
  return client.from('pantry_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
}
export async function addPantryItems(client: SupabaseClient<Database>, items: PantryInsert[]) {
  return client.from('pantry_items').insert(items).select(); // padrão de insert em lote — usar para consolidação
}
```

**Gating por plano (`apps/mobile/app/(tabs)/pantry.tsx:26-27,71-77`):**
```typescript
const limit        = profile?.plano === 'free' ? LIMITS.free.pantry_items : LIMITS.premium.pantry_items;
const limitReached = items.length >= limit;
// ...
{limitReached && (
  <Card><Text>Atingiste o limite de {limit} itens do plano Grátis. Faz upgrade para Premium...</Text></Card>
)}
```
Não existe hoje nenhum feature-flag booleano em `LIMITS`/`PLANS` (`packages/config/src/index.ts:19-36`) — só limites numéricos. A exportação Premium precisará de um check inline `profile?.plano === 'free'` (a bloquear a acção + mostrar upsell), tal como o padrão acima, sem entrada nova em `LIMITS` obrigatória.

**Reassign em lote (`apps/mobile/src/hooks/useSavedRecipes.ts:53-62`):**
```typescript
async function deleteColecao(nome: string) {
  const { error } = await reassignColecao(supabase!, userId, nome, 'favoritos');
  useSavedRecipesStore.getState().setItems(userId, items.map((i) => (i.colecao === nome ? { ...i, colecao: 'favoritos' } : i)));
}
```
Modelo directo para "limpar lista" (delete em lote por `user_id`) ou "marcar todos como comprados".

## Tabelas/Queries Supabase Relevantes

```sql
-- supabase/schema.sql:112-126
CREATE TABLE IF NOT EXISTS shopping_list (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome        text        NOT NULL,
  quantidade  text,
  comprado    boolean     DEFAULT false,
  recipe_id   text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_list: só o próprio" ON shopping_list FOR ALL USING (auth.uid() = user_id);
```
- Pronta para o CRUD básico (adicionar manual, marcar comprado, eliminar, limpar).
- `recipe_id` permite rastrear a receita de origem, mas **não há coluna para "semana de origem"** (necessária para a função de "gerar lista da semana" saber que itens vieram do `meal_plan` actual vs. anteriores) — a avaliar em `/plan` se basta re-derivar a lista a cada geração ou se precisa de metadado adicional.
- `meal_plan` (`supabase/schema.sql:93-109`) existe na base de dados mas **não tem entrada em `packages/types/src/database.ts` nem em `packages/supabase/src/queries/`** — qualquer query a esta tabela precisa de tipos e query functions novos, à semelhança de `pantry.ts`.
- `pantry_items` (`supabase/schema.sql:44-64`) é a fonte de comparação — `nome` é texto livre (ex: "Ovo", "Tomate"), sem normalização/unidade estruturada, o que afecta directamente a lógica de comparação.

## APIs Externas Relevantes

**Spoonacular — ingredientes com quantidade:**
- A Edge Function `search-recipes` já chama `informationBulk` (`supabase/functions/search-recipes/index.ts:79-81`), que devolve `extendedIngredients` (array com `name`, `amount`, `unit`) da Spoonacular — mas essa parte da resposta é descartada antes de devolver ao cliente (só `extractMacros`/`mapFiltros` são extraídos, linhas 30-40, 83-97).
- Não há chamada equivalente para receitas guardadas (`saved_recipes`) — se o utilizador quiser gerar lista a partir de uma receita já favoritada, não há `recipe_id` → ingredientes disponível sem nova chamada à API (a Spoonacular tem endpoint `GET /recipes/{id}/information` para isso).
- Cache Redis obrigatório (1h, `CACHE_TTL_SECONDS = 3600`, linha 9) já está implementado como padrão — reutilizável para uma nova função/endpoint de ingredientes.

**expo-calendar (Apple Reminders via EventKit):**
- Suporta Reminders (`getRemindersAsync`, `createReminderAsync`, `updateReminderAsync`, `deleteReminderAsync`, `Calendar.EntityTypes.REMINDER`, permissões `getRemindersPermissionsAsync`/`requestRemindersPermissionsAsync`) — mas **só em iOS**; em Android estas funções são no-op (Reminders é um conceito exclusivo do EventKit da Apple, sem equivalente Android ao nível do OS).
- **Requer development build / `expo prebuild`** — não funciona em Expo Go (módulo nativo removido do Expo Go managed desde SDK 45+).
- Info.plist: `NSRemindersUsageDescription` (+ `NSCalendarsUsageDescription`), configuráveis via config plugin do `expo-calendar` em `app.json`.
- Versão a fixar para Expo 53: `expo-calendar@14.1.4` (sobe o deployment target iOS para 15.1 — a validar contra o resto do projecto).

**Google Tasks API:**
- Requer OAuth 2.0 com scope `https://www.googleapis.com/auth/tasks`, **separado** do fluxo actual de Supabase Auth (que só pede `openid/email/profile`).
- Sem SDK oficial para RN — chamar a REST API directamente após obter o token (via `@react-native-google-signin/google-signin`, que não é compatível com Expo Go e precisa de dev/production build + config plugin).
- Quota gratuita: 50.000 queries/dia.
- Não existe deep-link documentado para pré-preencher uma Google Task a partir de outra app.

**Alternativa cross-platform unificada:** não existe biblioteca madura/mantida que abstraia "reminder" em iOS + Android (as opções encontradas são de baixo uso, sem config plugin Expo, exigindo bare workflow). Conceptualmente Android não tem um equivalente OS-level ao EventKit Reminders — só serviços cloud (Google Tasks/Keep) que exigem OAuth próprio. O caminho realista é: EventKit no iOS via `expo-calendar` + integração OAuth própria para Google Tasks no Android, como dois fluxos distintos.

**Share sheet de texto simples:**
- Usar `Share.share({ message })` (API nativa do React Native, `react-native`/`Share`), **não** `expo-sharing` (este último é para partilhar ficheiros via URI, não texto simples).
- `Share.share` funciona em Expo Go, sem instalação adicional nem config plugin.

## Code Snippets de Referência

**Único precedente de integração externa no repo (Linking, não Share):**
```typescript
// apps/mobile/src/components/recipe/RecipeDetailModal.tsx:1-19
import * as Linking from 'expo-linking';
function handleOpenSource() {
  if (recipe!.source_url) Linking.openURL(recipe!.source_url);
}
```

**Shape actual da resposta da Edge Function de pesquisa (sem quantidade/unidade):**
```typescript
// supabase/functions/search-recipes/index.ts:83-97
{
  id, titulo, thumbnail_url, source_url, tempo_minutos, macros, filtros,
  ingredientes_usados:   r.usedIngredients.map((i) => i.name),   // só nomes
  ingredientes_em_falta: r.missedIngredients.map((i) => i.name), // só nomes
  total_ingredientes:    r.usedIngredientCount + r.missedIngredientCount,
}
```

## Questões em Aberto

1. **Fonte de ingredientes com quantidade/unidade** — precisa de decisão em `/plan`: (a) estender a Edge Function `search-recipes` (ou criar uma nova, ex: `recipe-ingredients`) para devolver `extendedIngredients` (nome, amount, unit) já obtidos de `informationBulk` mas hoje descartados; (b) adicionar uma chamada dedicada `GET /recipes/{id}/information` no momento de "adicionar à lista"; (c) persistir ingredientes estruturados numa nova coluna/tabela ligada a `saved_recipes` no momento de guardar a receita. Para receitas de vídeo (YouTube/TikTok/Instagram, sem ID Spoonacular), não há fonte de ingredientes estruturados nenhuma — a decidir se essas receitas ficam de fora da geração automática (apenas adição manual) ou se há uma futura extracção manual/OCR.
2. **Normalização de nomes** (ex: "tomate" vs "tomates", acentos, maiúsculas) para a comparação `ingredientes vs pantry_items.nome` — não há nenhuma normalização hoje em `pantry_items` (texto livre); decidir se a comparação é fuzzy client-side (ex: lowercase + strip acentos + singular/plural simples) ou se precisa de uma função/coluna normalizada no Supabase.
3. **`meal_plan` sem camada de tipos/queries e `planner.tsx` como stub** — a função "gerar lista da semana" depende de dados que hoje não têm nenhuma UI nem query a popular `meal_plan`. Confirmar em `/plan` se esta ticket deve também criar o mínimo de query layer para `meal_plan` (mesmo sem UI de planner), ou se a função fica prevista mas não testável end-to-end até F09 existir.
4. **Onde encaixar o ecrã na navegação** — com 6 tabs já existentes, o padrão mais consistente com o resto do código (ex: `RecipeDetailModal` como modal) é um ecrã/modal acessível a partir da receita e do planner, não um 7º tab dedicado — a confirmar com o utilizador em `/plan`.
5. **Exportação Reminders/Google Tasks exige dev/production build** — nenhuma destas integrações funciona em Expo Go; implica que o fluxo de desenvolvimento/teste desta feature específica (exportação) só é testável com um custom dev client já configurado — confirmar se isso já existe no projecto ou se é um pré-requisito a montar primeiro.
6. **Discrepância de versão notada lateralmente:** CLAUDE.md lista Expo 53.0.27 com React Native 0.76.7, mas o SDK 53 oficial da Expo emparelha com React Native 0.79 — vale confirmar a versão real instalada (`apps/mobile/package.json`) antes de fixar versões de `expo-calendar`/outros módulos nativos, para evitar incompatibilidades silenciosas.
