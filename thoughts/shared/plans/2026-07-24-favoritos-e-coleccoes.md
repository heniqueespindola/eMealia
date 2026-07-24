---
data: 2026-07-24
feature: "Favoritos e Coleções"
research: "thoughts/shared/research/2026-07-24-favoritos-e-coleccoes.md"
status: completo
---

# Spec: Favoritos e Coleções (F06)

## Visão Geral
Cria o ecrã de gestão de receitas guardadas (F06): listagem por coleção, criação/eliminação de coleções (texto livre, sem tabela nova), mover receitas entre coleções por long-press, filtro por filtro dietético e por fonte, detalhe com macros completos e acesso à fonte original — e corrige os dois gaps deixados pelo research na integração já existente em `search.tsx` (falta de gate de limite e falta de `tempo_minutos` gravado).

## Decisões tomadas (resolvendo as questões em aberto do research)
1. **`colecao` mantém-se texto livre** — sem tabela `collections` nova, sem migration de schema para isso. As 3 coleções por omissão (`favoritos`, `para_experimentar`, `semana`) vivem numa constante `DEFAULT_COLECOES` em `@emealia/config`. A lista de coleções disponíveis no ecrã é a união dessa constante com os valores distintos de `colecao` já existentes nas receitas do utilizador + coleções custom criadas nesta sessão (guardadas em memória no Zustand store, não persistidas — se o utilizador criar uma coleção vazia e nunca lhe mover nenhuma receita, ela desaparece ao reiniciar a app; assumido e aceite).
2. **Eliminar coleção → `UPDATE` em lote no cliente** (`reassignColecao`), sem função/RPC no Postgres — consistente com o resto do projecto (nenhuma feature usa RPC hoje).
3. **Acesso à fonte original → sempre `Linking.openURL(source_url)`**, sem embed de vídeo nem `expo-web-browser`. Não há nenhum embed no repo (nem no feed F03), e `expo-linking` já está instalado. Isto simplifica o botão "abrir receita original" para uma única acção, igual para todas as fontes (sem branch por `fonte`).
4. **Nova 6ª tab "Favoritos"** em `app/(tabs)/_layout.tsx`, entre `search` e `pantry`.
5. **Gap de schema descoberto durante o planeamento**: `saved_recipes` não tem coluna `tempo_minutos`, mas o critério de aceitação pede "tempo de preparação" na listagem. `search.tsx` já tem `recipe.tempo_minutos` disponível em `RecipeSearchResult` mas nunca o grava. Resolução: adicionar coluna `tempo_minutos int` (nullable, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, sem migration formal — segue o padrão actual do projecto de editar `schema.sql` directamente) e passar a gravá-la em `search.tsx`.
6. **Limite de 10 receitas (`free`)**: o research assinalava que hoje não é aplicado em lado nenhum. Apesar do ticket listar "lógica de guardar receita a partir do feed/pesquisa" como fora de escopo, o `search.tsx` é o único ponto de entrada real de gravação hoje — sem corrigir o gate ali, o critério de aceitação do limite nunca seria demonstrável. Esta spec inclui a correcção mínima (replicar o padrão já usado em `pantry.tsx`), não a reconstrução da lógica de pesquisa/guardar.
7. **`SourceBadge` estende-se para `RecipeSource`** (em vez de `VideoSource`), com `spoonacular`/`blog` mapeados para a cor `colors.emealia` (âmbar) + texto `primaryDark`, tal como o ticket pede ("eMealia/Spoonacular âmbar"). É uma mudança não-destrutiva (`VideoSource` é subconjunto de `RecipeSource`), os usos existentes em `VideoCard.tsx` continuam a compilar.
8. **Filtro por fonte** cobre as 4 fontes citadas explicitamente no ticket: `youtube`, `tiktok`, `instagram`, `spoonacular` (constante nova `FONTES_FAVORITOS`).

---

## Ficheiros a Modificar

### `supabase/schema.sql`
**Modificações:**
- [x] Depois do bloco `CREATE TABLE IF NOT EXISTS saved_recipes (...)` (linha ~80), adicionar:
  ```sql
  ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS tempo_minutos int;
  ```
- [x] Nota: correr este `ALTER TABLE` manualmente no Supabase (SQL editor) depois de aprovar a spec — não há sistema de migrations activo neste projecto (`supabase/migrations/` está vazio).

### `packages/types/src/recipe.ts`
**Modificações:**
- [x] Na interface `SavedRecipe` (linhas 37-49), adicionar campo depois de `macros`:
  ```typescript
  tempo_minutos: number | null;
  ```

### `packages/config/src/index.ts`
**Modificações:**
- [x] Depois de `FILTROS_DIETETICOS` (linha 48), adicionar:
  ```typescript
  export const DEFAULT_COLECOES = [
    { value: 'favoritos',         label: 'Favoritos' },
    { value: 'para_experimentar', label: 'Para experimentar' },
    { value: 'semana',            label: 'Semana' },
  ] as const;

  export const FONTES_FAVORITOS = [
    { value: 'youtube',     label: 'YouTube' },
    { value: 'tiktok',      label: 'TikTok' },
    { value: 'instagram',   label: 'Instagram' },
    { value: 'spoonacular', label: 'Spoonacular' },
  ] as const;
  ```

### `packages/supabase/src/queries/recipes.ts`
**Modificações:**
- [x] Adicionar depois de `unsaveRecipe`:
  ```typescript
  export async function updateSavedRecipe(
    client: SupabaseClient<Database>,
    id: string,
    updates: Partial<SavedRecipe>
  ) {
    return client.from('saved_recipes').update(updates).eq('id', id).select().single();
  }

  export async function reassignColecao(
    client: SupabaseClient<Database>,
    userId: string,
    deColecao: string,
    paraColecao = 'favoritos'
  ) {
    return client
      .from('saved_recipes')
      .update({ colecao: paraColecao })
      .eq('user_id', userId)
      .eq('colecao', deColecao);
  }
  ```
  (padrão idêntico a `updatePantryItem` em `packages/supabase/src/queries/pantry.ts:17-23`)

### `apps/mobile/src/components/feed/SourceBadge.tsx`
**Modificações:**
- [x] Trocar import `VideoSource` → `RecipeSource` (de `@emealia/types`)
- [x] Substituir `LABELS`/o uso directo de `colors[fonte]` por dois records completos cobrindo `RecipeSource`:
  ```typescript
  import type { RecipeSource } from '@emealia/types';

  interface SourceBadgeProps {
    fonte: RecipeSource;
  }

  const LABELS: Record<RecipeSource, string> = {
    youtube:     'YouTube',
    tiktok:      'TikTok',
    instagram:   'Instagram',
    emealia:     'eMealia',
    spoonacular: 'Spoonacular',
    blog:        'Blog',
  };

  const BACKGROUND: Record<RecipeSource, string> = {
    youtube:     colors.youtube,
    tiktok:      colors.tiktok,
    instagram:   colors.instagram,
    emealia:     colors.emealia,
    spoonacular: colors.emealia,
    blog:        colors.emealia,
  };

  const TEXTO_ESCURO: RecipeSource[] = ['emealia', 'spoonacular', 'blog'];
  ```
- [x] No JSX, `backgroundColor: BACKGROUND[fonte]` e `color: TEXTO_ESCURO.includes(fonte) ? colors.primaryDark : colors.textInverted`
- [x] Confirmar que `apps/mobile/src/components/feed/VideoCard.tsx` (único outro consumidor) continua a compilar sem alterações — `VideoSource` é subconjunto de `RecipeSource`

### `apps/mobile/app/(tabs)/_layout.tsx`
**Modificações:**
- [x] Adicionar tab entre `search` (linha 27) e `pantry` (linha 28):
  ```tsx
  <Tabs.Screen name="favoritos" options={{ title: 'Favoritos' }} />
  ```

### `apps/mobile/app/(tabs)/search.tsx`
**Modificações:**
- [x] Importar `LIMITS` de `@emealia/config` e `useProfile` de `@/hooks/useProfile`
- [x] Depois de `const { user } = useAuth();` (linha 21), adicionar:
  ```typescript
  const { profile } = useProfile(user?.id);
  const limit        = profile?.plano === 'free' ? LIMITS.free.saved_recipes : LIMITS.premium.saved_recipes;
  const limitReached = savedMap.size >= limit;
  ```
- [x] Em `handleToggleSave` (linha 65-91), no ramo `else` (a criar novo save), adicionar guarda no topo do ramo:
  ```typescript
  } else {
    if (limitReached) return;
    const { data } = await saveRecipe(supabase!, {
      ...
      tempo_minutos: recipe.tempo_minutos,   // <- novo campo
      ...
    });
  ```
- [x] Adicionar `tempo_minutos: recipe.tempo_minutos` ao objecto passado a `saveRecipe` (linhas 76-86)
- [x] Na UI, antes do `FlatList` (por volta da linha 120), mostrar mensagem de limite quando `limitReached`, seguindo o padrão de `pantry.tsx:71-79`:
  ```tsx
  {limitReached && (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
      <Card>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
          Atingiste o limite de {limit} receitas guardadas do plano Grátis. Faz upgrade para Premium para guardares mais.
        </Text>
      </Card>
    </View>
  )}
  ```
  (importar `Card` de `@/components/ui/Card`)

---

## Ficheiros a Criar

### `apps/mobile/src/stores/savedRecipesStore.ts`
**Propósito:** Estado global Zustand para receitas guardadas, espelhando `pantryStore.ts`.
**Conteúdo:**
```typescript
import { create } from 'zustand';
import type { SavedRecipe } from '@emealia/types';

interface SavedRecipesState {
  items:            SavedRecipe[];
  loading:          boolean;
  loadedUserId:     string | null;
  customColecoes:   string[];       // coleções criadas nesta sessão, ainda sem receitas
  setItems:         (userId: string, items: SavedRecipe[]) => void;
  setLoading:       (loading: boolean) => void;
  addItem:          (item: SavedRecipe) => void;
  updateItem:       (item: SavedRecipe) => void;
  removeItem:       (id: string) => void;
  addCustomColecao: (nome: string) => void;
  removeCustomColecao: (nome: string) => void;
  reset:            () => void;
}

export const useSavedRecipesStore = create<SavedRecipesState>((set) => ({
  items:            [],
  loading:          true,
  loadedUserId:     null,
  customColecoes:   [],
  setItems:         (userId, items) => set({ items, loadedUserId: userId, loading: false }),
  setLoading:       (loading) => set({ loading }),
  addItem:          (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem:       (item) => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem:       (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  addCustomColecao: (nome) => set((s) => (s.customColecoes.includes(nome) ? s : { customColecoes: [...s.customColecoes, nome] })),
  removeCustomColecao: (nome) => set((s) => ({ customColecoes: s.customColecoes.filter((c) => c !== nome) })),
  reset:            () => set({ items: [], loadedUserId: null, loading: false, customColecoes: [] }),
}));
```

### `apps/mobile/src/hooks/useSavedRecipes.ts`
**Propósito:** Hook fino sobre `savedRecipesStore`, espelhando `usePantry.ts`.
**Conteúdo:**
```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getSavedRecipes, saveRecipe, unsaveRecipe, updateSavedRecipe, reassignColecao } from '@emealia/supabase';
import { useSavedRecipesStore } from '@/stores/savedRecipesStore';
import type { SavedRecipe, Database } from '@emealia/types';

type SavedRecipeInsert = Database['public']['Tables']['saved_recipes']['Insert'];

export function useSavedRecipes(userId: string | undefined) {
  const items          = useSavedRecipesStore((s) => s.items);
  const loading        = useSavedRecipesStore((s) => s.loading);
  const customColecoes = useSavedRecipesStore((s) => s.customColecoes);

  useEffect(() => {
    if (!userId) {
      useSavedRecipesStore.getState().reset();
      return;
    }
    if (useSavedRecipesStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    useSavedRecipesStore.getState().setLoading(true);
    const { data, error } = await getSavedRecipes(supabase!, uid);
    if (error) console.error('[useSavedRecipes] getSavedRecipes falhou:', error);
    useSavedRecipesStore.getState().setItems(uid, data ?? []);
  }

  async function save(recipe: Omit<SavedRecipeInsert, 'user_id'>) {
    if (!userId) return;
    const { data, error } = await saveRecipe(supabase!, { ...recipe, user_id: userId } as any);
    if (error) { console.error('[useSavedRecipes] saveRecipe falhou:', error); return; }
    if (data) useSavedRecipesStore.getState().addItem(data);
  }

  async function unsave(id: string) {
    const { error } = await unsaveRecipe(supabase!, id);
    if (error) { console.error('[useSavedRecipes] unsaveRecipe falhou:', error); return; }
    useSavedRecipesStore.getState().removeItem(id);
  }

  async function moveToColecao(id: string, colecao: string) {
    const { data, error } = await updateSavedRecipe(supabase!, id, { colecao });
    if (error) { console.error('[useSavedRecipes] updateSavedRecipe falhou:', error); return; }
    if (data) useSavedRecipesStore.getState().updateItem(data);
  }

  function createColecao(nome: string) {
    useSavedRecipesStore.getState().addCustomColecao(nome);
  }

  async function deleteColecao(nome: string) {
    if (!userId) return;
    const { error } = await reassignColecao(supabase!, userId, nome, 'favoritos');
    if (error) { console.error('[useSavedRecipes] reassignColecao falhou:', error); return; }
    useSavedRecipesStore.getState().setItems(
      userId,
      items.map((i) => (i.colecao === nome ? { ...i, colecao: 'favoritos' } : i))
    );
    useSavedRecipesStore.getState().removeCustomColecao(nome);
  }

  function refetch() {
    if (userId) fetchItems(userId);
  }

  return { items, loading, customColecoes, save, unsave, moveToColecao, createColecao, deleteColecao, refetch };
}
```

### `apps/mobile/src/constants/favoritos.ts`
**Propósito:** Helpers de derivação de coleções disponíveis, seguindo o padrão de `src/constants/pantry.ts` (`agruparPorCategoria`).
**Conteúdo:**
```typescript
import { DEFAULT_COLECOES } from '@emealia/config';
import type { SavedRecipe } from '@emealia/types';

export interface ColecaoOption {
  value: string;
  label: string;
}

export function getColecoesDisponiveis(items: SavedRecipe[], customColecoes: string[]): ColecaoOption[] {
  const defaultValues = DEFAULT_COLECOES.map((c) => c.value as string);
  const distintos = new Set<string>();
  items.forEach((i) => distintos.add(i.colecao));
  customColecoes.forEach((c) => distintos.add(c));

  const extras: ColecaoOption[] = [...distintos]
    .filter((v) => !defaultValues.includes(v))
    .map((v) => ({ value: v, label: v }));

  return [...DEFAULT_COLECOES, ...extras];
}

export function isColecaoPadrao(value: string): boolean {
  return DEFAULT_COLECOES.some((c) => c.value === value);
}
```

### `apps/mobile/src/components/recipe/SavedRecipeCard.tsx`
**Propósito:** Card de receita guardada na listagem de favoritos (thumbnail, título, badge de fonte, tempo+kcal, filtros), adaptado de `RecipeCard.tsx` mas usando `SavedRecipe`.
**Conteúdo:**
- Props: `{ recipe: SavedRecipe; onPress: () => void; onLongPress: () => void }`
- `Pressable` com `onPress`/`onLongPress` envolvendo um `Card`/`View` no mesmo estilo de `RecipeCard.tsx:22-65` (thumbnail 96x96, título `numberOfLines={2}`, metadata `"${tempo_minutos} min · ${macros.calorias} kcal"` filtrando nulos como em `RecipeCard`)
- Usa `SourceBadge` (agora aceitando `RecipeSource`) por cima do thumbnail ou junto à metadata
- Mostra pills de `filtros` via `FILTROS_DIETETICOS` (igual a `RecipeCard.tsx:41-59`)
- Sem toggle de coração (guardar/desguardar não faz parte deste ecrã, ver Decisão 6 acima — a gestão de "guardar" continua em `search.tsx`)
- Manter sob 150 linhas

### `apps/mobile/src/components/recipe/ColecaoPickerModal.tsx`
**Propósito:** Modal para mover uma receita entre coleções (aberto via long-press num `SavedRecipeCard`).
**Conteúdo:**
- Props: `{ visible: boolean; colecoes: ColecaoOption[]; onSelect: (colecao: string) => void; onClose: () => void }`
- `Modal` (`animationType="slide"`) com `ScrollView`/`View` listando `Pill` por cada `colecao` (estilo igual a `CATEGORIAS_DESPENSA` em `PantryItemForm.tsx:123-132`); `onPress` de cada `Pill` chama `onSelect(value)` e fecha o modal

### `apps/mobile/src/components/recipe/CreateColecaoModal.tsx`
**Propósito:** Modal simples para criar uma coleção nova com nome personalizado (sem `Alert.prompt`, que não existe no Android).
**Conteúdo:**
- Props: `{ visible: boolean; coleccoesExistentes: string[]; onCreate: (nome: string) => void; onClose: () => void }`
- `Modal` com `Input` (label "Nome da coleção") + `Button label="Criar"` desabilitado se nome vazio ou já existente em `coleccoesExistentes` (comparação case-insensitive trimmed)
- Ao submeter: `onCreate(nome.trim())` e fecha

### `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`
**Propósito:** Modal de detalhe de uma receita guardada — macros completos + botão de acesso à fonte original.
**Conteúdo:**
```typescript
import { Modal, View, Text, Image, ScrollView, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { SourceBadge } from '@/components/feed/SourceBadge';
import { colors, fonts, spacing } from '@/constants/theme';
import { FILTROS_DIETETICOS } from '@emealia/config';
import type { SavedRecipe } from '@emealia/types';

interface RecipeDetailModalProps {
  visible: boolean;
  recipe:  SavedRecipe | null;
  onClose: () => void;
}

export function RecipeDetailModal({ visible, recipe, onClose }: RecipeDetailModalProps) {
  if (!recipe) return null;

  function handleOpenSource() {
    if (recipe!.source_url) Linking.openURL(recipe!.source_url);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDark }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* header com botão Fechar, thumbnail grande, título, SourceBadge */}
        {/* bloco de macros: calorias / proteínas / hidratos / gorduras a partir de recipe.macros */}
        {/* pills de recipe.filtros via FILTROS_DIETETICOS */}
        <Button label="Abrir receita original" onPress={handleOpenSource} disabled={!recipe.source_url} />
      </ScrollView>
    </Modal>
  );
}
```
- Padrão de header/fechar igual a `PantryItemForm.tsx:96-103`
- Manter sob 150 linhas (se ultrapassar, extrair bloco de macros para um pequeno subcomponente `MacroBar`/`MacroBreakdown` já sugerido em `CLAUDE.md` sob `components/recipe/MacroBar.tsx` — usar este nome se for necessário extrair)

### `apps/mobile/app/(tabs)/favoritos.tsx`
**Propósito:** Ecrã principal de Favoritos e Coleções.
**Conteúdo:**
- `useAuth()` + `useSavedRecipes(user?.id)` + `useProfile(user?.id)`
- Estado local: `colecaoActual` (default `'favoritos'`), `filtrosSelecionados: FiltroDietetico[]`, `fontesSelecionadas: RecipeSource[]`, `pickerVisible` (+ `recipeParaMover: SavedRecipe | null`), `createColecaoVisible`, `detalheRecipe: SavedRecipe | null`
- `colecoes = getColecoesDisponiveis(items, customColecoes)` (de `@/constants/favoritos`)
- Linha horizontal de `Pill` por `colecao` (`onPress` seleciona, `onLongPress` em coleção não-padrão via `isColecaoPadrao` abre `Alert.alert` de confirmação → `deleteColecao(nome)`, seguindo o padrão de `PantryItemCard.tsx:17-22`) + `Pill` final "+ Nova coleção" que abre `CreateColecaoModal`
- `FilterRow` (filtros dietéticos, já existente) + linha adicional de `Pill` para `FONTES_FAVORITOS` (fonte)
- Lista filtrada: `items.filter(i => i.colecao === colecaoActual && (filtrosSelecionados.length === 0 || filtrosSelecionados.some(f => i.filtros.includes(f))) && (fontesSelecionadas.length === 0 || fontesSelecionadas.includes(i.fonte)))`
- `FlatList` de `SavedRecipeCard` (`onPress` → abre `RecipeDetailModal`, `onLongPress` → abre `ColecaoPickerModal` com `onSelect` chamando `moveToColecao(item.id, novaColecao)`)
- Mensagem de vazio (`ListEmptyComponent`) seguindo o padrão de `pantry.tsx:94-100`
- Sem banner de limite aqui (o limite aplica-se ao acto de guardar, que acontece em `search.tsx` — ver Decisão 6)
- `SafeAreaView` + cabeçalho igual ao padrão de `pantry.tsx:64-69`

---

## Fases de Implementação

### Fase 1: Schema, tipos e queries — base de dados
**Ficheiros:**
- Modificar `supabase/schema.sql` (coluna `tempo_minutos`)
- Modificar `packages/types/src/recipe.ts` (`SavedRecipe.tempo_minutos`)
- Modificar `packages/config/src/index.ts` (`DEFAULT_COLECOES`, `FONTES_FAVORITOS`)
- Modificar `packages/supabase/src/queries/recipes.ts` (`updateSavedRecipe`, `reassignColecao`)

**Critérios de sucesso (automáticos):**
- [x] `npm run typecheck` (raiz) passa sem erros
- [x] `ALTER TABLE` corrido manualmente no Supabase (SQL editor) — confirmar coluna `tempo_minutos` visível no schema remoto

**Critérios de sucesso (manuais):**
- [x] Nenhum

### Fase 2: Estado e hook de favoritos
**Ficheiros:**
- Criar `apps/mobile/src/stores/savedRecipesStore.ts`
- Criar `apps/mobile/src/hooks/useSavedRecipes.ts`
- Criar `apps/mobile/src/constants/favoritos.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` (mobile) passa sem erros

### Fase 3: Componentes UI de receita/coleção
**Ficheiros:**
- Modificar `apps/mobile/src/components/feed/SourceBadge.tsx`
- Criar `apps/mobile/src/components/recipe/SavedRecipeCard.tsx`
- Criar `apps/mobile/src/components/recipe/ColecaoPickerModal.tsx`
- Criar `apps/mobile/src/components/recipe/CreateColecaoModal.tsx`
- Criar `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros
- [x] `expo lint` sem warnings
- [x] Todos os ficheiros novos sob 150 linhas

**Critérios de sucesso (manuais):**
- [x] Feed (`VideoCard`) continua a renderizar badges de fonte correctamente após a extensão de `SourceBadge` para `RecipeSource`

### Fase 4: Ecrã de Favoritos e navegação
**Ficheiros:**
- Criar `apps/mobile/app/(tabs)/favoritos.tsx`
- Modificar `apps/mobile/app/(tabs)/_layout.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [x] Tab "Favoritos" aparece entre "Pesquisar" e "Despensa" no simulador
- [x] Com receitas já guardadas (via `search.tsx`), a lista aparece na coleção "Favoritos" por omissão
- [x] Criar coleção nova, mover uma receita para lá via long-press, confirmar que aparece filtrada correctamente
- [x] Eliminar a coleção criada com receitas lá dentro → confirmar que as receitas voltam a aparecer em "Favoritos"
- [x] Tentar eliminar uma coleção por omissão (ex: "Favoritos") → não deve ser possível (sem long-press de eliminar nessas pills)
- [x] Aplicar filtro dietético e filtro de fonte em conjunto → lista reduz correctamente
- [x] Abrir detalhe de uma receita → ver macros completos e tocar "Abrir receita original" → abre o browser/app externo

### Fase 5: Gate de limite e correcção de `tempo_minutos` em `search.tsx`
**Ficheiros:**
- Modificar `apps/mobile/app/(tabs)/search.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [x] Com plano `free` e 10 receitas já guardadas, tentar guardar uma 11ª → botão de guardar não regista nova receita e aparece mensagem de limite
- [x] Com plano `premium_monthly`/`premium_annual`, guardar mais de 10 receitas sem bloqueio
- [x] Nova receita guardada aparece em Favoritos já com `tempo de preparação` visível (não `null`)

---

## Estratégia de Testes
- **Unit:** Nenhum framework de testes automatizados está configurado no monorepo hoje (confirmar `package.json` raiz/`apps/mobile` antes de assumir Jest) — esta feature segue o padrão existente de validação manual + `tsc --noEmit` + `expo lint`.
- **Manual:** Ver critérios de sucesso manuais de cada fase, correr no simulador iOS e Android via `npm run mobile`.

## Notas de Implementação
- O limite de 10 receitas continua **100% client-side** (sem alteração de RLS), replicando exactamente o padrão de `pantry_items`/`pantry.tsx` — nenhuma validação no Postgres.
- `SavedRecipe.fonte` continua a ser gravado como `'spoonacular'` hardcoded em `search.tsx` — corrigir isto para fontes reais (`youtube`/`tiktok`/`instagram`) fica fora de escopo desta spec, é relevante apenas quando o F03 (feed de vídeos) ganhar o seu próprio botão de guardar.
- Coleções custom criadas sem receitas lá dentro **não sobrevivem a um restart da app** (vivem só em memória no `savedRecipesStore`) — é uma limitação aceite, documentada acima na Decisão 1, não um bug.
- `ColecaoPickerModal` e `CreateColecaoModal` são componentes separados propositadamente (mover vs. criar são acções distintas com estados diferentes) — não fundir num único modal "genérico" para não acoplar duas responsabilidades.
- Ao editar `SourceBadge.tsx`, confirmar que não há mais nenhum consumidor além de `VideoCard.tsx` e o novo `SavedRecipeCard.tsx`/`RecipeDetailModal.tsx` antes de considerar a mudança de tipo concluída.

## Referências
- Research: `thoughts/shared/research/2026-07-24-favoritos-e-coleccoes.md`
- Ticket: `thoughts/shared/tickets/2026-07-24-favoritos-e-coleccoes.md`
- Padrão de hook+store: `apps/mobile/src/hooks/usePantry.ts`, `apps/mobile/src/stores/pantryStore.ts`
- Padrão de gate de limite: `apps/mobile/app/(tabs)/pantry.tsx:26-27,71-79`
- Padrão de confirmação de eliminação: `apps/mobile/src/components/pantry/PantryItemCard.tsx:17-22`
- Padrão de modal de formulário: `apps/mobile/src/components/pantry/PantryItemForm.tsx`
