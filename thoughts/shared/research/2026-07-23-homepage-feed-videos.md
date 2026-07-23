---
data: 2026-07-23
feature: "Homepage com Feed de Vídeos (F03)"
status: completo
---

# Research: Homepage com Feed de Vídeos (F03)

## Questão de Pesquisa
Como estruturar o carrossel de vídeos da homepage em Expo Router (`app/(tabs)/index.tsx`), incluindo a lógica de escala/overlay dos cards adjacentes, o anel de progresso SVG do autoplay, a gestão de estado do filtro de categoria com `react-native-reanimated`, e a transição de dados mock para a tabela `video_cache` do Supabase com personalização por `filtros_dieteticos`?

## Sumário
O ecrã `app/(tabs)/index.tsx` existe apenas como placeholder ("F03 — Homepage + feed de vídeos"). Já existe, no entanto, uma base funcional real: `useFeed.ts` (hook) e `getFeed` (query partilhada) já leem `video_cache` filtrando por um único `FiltroDietetico`, o tipo `VideoItem` já está definido em `@emealia/types`, e a Edge Function `youtube-feed` já popula a fonte de dados. Não existe nenhum componente de carrossel, `VideoCard`, `SourceBadge` ou lógica de autoplay/anel de progresso — esta parte é greenfield. As libs necessárias (`react-native-reanimated@3.17.4`, `react-native-gesture-handler@2.24.0`, `react-native-svg@15.11.2`) já estão instaladas e pinadas nas versões correctas; falta apenas decidir se se usa `react-native-reanimated-carousel` (recomendado) ou um carrossel manual sobre `Animated.FlatList`.

## Ficheiros Relevantes da Codebase

- `apps/mobile/app/(tabs)/index.tsx` — ecrã placeholder actual da homepage; é aqui que o carrossel será montado
- `apps/mobile/src/hooks/useFeed.ts:5-33` — hook existente que já busca `video_cache` via Supabase, filtra por **um único** `FiltroDietetico` (`.contains('filtros', [filtro])`) e ordena por `views` desc, limit 20; não faz reordenação por múltiplos filtros nem pondera por `filtros_dieteticos` do perfil
- `packages/supabase/src/queries/feed.ts:4-18` — `getFeed(client, filtro?, limit=20)`, a query partilhada usada pelo hook acima; único ponto de acesso a `video_cache`
- `packages/types/src/feed.ts` — define `VideoSource` e `VideoItem` (nota: campos em `snake_case` — `youtube_id`, `thumbnail_url`, `publicado_em`, `cached_at` —, ao contrário do `VideoItem` em camelCase descrito no `CLAUDE.md`; **a codebase real usa snake_case, alinhado 1:1 com as colunas de `video_cache`**)
- `packages/types/src/user.ts` — `FiltroDietetico`, `Profile` (inclui `filtros_dieteticos: FiltroDietetico[]`, `frequencia_cozinha`, `onboarding_completo` — estes dois últimos foram adicionados durante a implementação do onboarding e **não estavam no schema descrito no `CLAUDE.md` original**)
- `apps/mobile/src/hooks/useProfile.ts` — padrão para obter o perfil autenticado (via `useProfileStore` + `getProfile`); é daqui que se lê `profile.filtros_dieteticos` para personalizar o feed
- `apps/mobile/src/stores/profileStore.ts`, `onboardingStore.ts`, `authStore.ts`, `pantryStore.ts` — padrão Zustand já estabelecido; qualquer estado de filtro/carrossel activo pode seguir este padrão ou ficar local ao componente (a decidir em `/plan`)
- `apps/mobile/src/components/ui/Pill.tsx` — componente de pill já implementado e pronto a reutilizar tal como está para os filtros de categoria (Todos, Rápidas, Vegan, Airfryer, Sobremesas); aceita `label`, `selected`, `onPress`
- `apps/mobile/src/components/ui/Button.tsx` — padrão de estilo de referência (estilos inline com tokens do tema, não NativeWind, apesar de o placeholder actual usar `className`)
- `apps/mobile/src/constants/theme.ts` — `colors`, `fonts`, `spacing`, `radius`; contém já `youtube`, `tiktok`, `instagram`, `emealia` para os badges de fonte
- `apps/mobile/app/(tabs)/_layout.tsx` — regista o tab "Início" (`index`) com `headerShown: false`; a homepage terá de implementar o seu próprio header (fundo `#1B2632` + logo), não vem do layout de tabs
- `apps/mobile/app/onboarding/step3.tsx` — melhor exemplo actual no código de multi-select com `Pill` (padrão `toggleFiltro`), útil como referência de interacção embora não seja carrossel
- `supabase/functions/youtube-feed/index.ts` — Edge Function que chama `youtube.search.list`, custa 100 unidades/chamada, com nota de cache de 4h (`CACHE_TTL_SECONDS = 14400`); não é chamada directamente pelo feed da homepage (que lê apenas de `video_cache`) — presumivelmente é o processo que popula/actualiza `video_cache` (cron/back-office), não está confirmado onde é invocada
- `supabase/functions/search-recipes/index.ts` — Edge Function irmã para Spoonacular (F04), não relevante aqui excepto como padrão de Edge Function

## Padrões de Implementação Existentes

**Query Supabase com filtro opcional** (`packages/supabase/src/queries/feed.ts`):
```typescript
export async function getFeed(
  client: SupabaseClient<Database>,
  filtro?: FiltroDietetico,
  limit = 20
) {
  let query = client
    .from('video_cache')
    .select('*')
    .order('views', { ascending: false })
    .limit(limit);

  if (filtro) query = query.contains('filtros', [filtro]);

  return query;
}
```
Este é o ponto de extensão natural: para suportar múltiplos filtros de categoria (Rápidas, Vegan, Airfryer, Sobremesas) e personalização por `filtros_dieteticos` do perfil, esta função terá provavelmente de aceitar um array de filtros ou uma lógica de "priorizar correspondências" em vez de apenas um `filtro` singular.

**Hook de dados** (`apps/mobile/src/hooks/useFeed.ts`):
```typescript
export function useFeed(filtro?: FiltroDietetico) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ... fetchFeed() no useEffect, dependente de [filtro]
  return { videos, loading, error };
}
```

**Componente de pill reutilizável** (`apps/mobile/src/components/ui/Pill.tsx`) — já implementa exactamente o estilo pedido (fundo `#2C3B4D`/borda `colors.border` quando inactivo via `transparent` + `borderColor`, fundo `#FFB162` quando `selected`). **Nota:** o Pill actual usa `backgroundColor: 'transparent'` no estado inactivo, não `#2C3B4D` sólido — se o ticket exige fundo `#2C3B4D` sólido nas pills inactivas, é preciso decidir em `/plan` se se ajusta o componente partilhado (usado também no onboarding) ou se se cria uma variante.

**Estilo dos componentes UI reais** — todos os componentes já implementados (`Button`, `Pill`, ecrãs de onboarding) usam `style={{ ... }}` inline com os tokens `colors`/`fonts`/`radius` importados de `@/constants/theme`, **não** classes NativeWind (`className`). Os únicos sítios que usam `className="bg-bgDark"` etc. são os ecrãs placeholder ainda por implementar (`index.tsx`, `search.tsx`). Ou seja: ao implementar a homepage a sério, o padrão a seguir é estilos inline com tokens, consistente com o resto do código já escrito.

**Gestão de perfil para personalização:**
```typescript
// apps/mobile/src/hooks/useProfile.ts
export function useProfile(userId: string | undefined) {
  const profile = useProfileStore((s) => s.profile);
  // ... getProfile(supabase!, userId) preenche useProfileStore
  return { profile, loading };
}
```
`profile.filtros_dieteticos` é a fonte para personalização do feed.

## Tabelas/Queries Supabase Relevantes

**Tabela `video_cache`** (`supabase/schema.sql:122-138`), comentada explicitamente como *"partilhada — sem RLS de utilizador"*:
```sql
CREATE TABLE IF NOT EXISTS video_cache (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id        text        UNIQUE NOT NULL,
  titulo            text        NOT NULL,
  canal             text        NOT NULL,
  thumbnail_url     text,
  duracao           text,
  views             bigint      DEFAULT 0,
  publicado_em      timestamptz,
  filtros           text[]      DEFAULT '{}',
  ingredientes_chave text[]     DEFAULT '{}',
  cached_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_cache_filtros_idx ON video_cache USING GIN(filtros);
CREATE INDEX IF NOT EXISTS video_cache_views_idx   ON video_cache(views DESC);
```
- **Sem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`** para esta tabela — ao contrário de `profiles`, `pantry_items`, `saved_recipes`, `meal_plan`, `shopping_list`, que têm todas RLS `"só o próprio"`. `video_cache` é dados partilhados/públicos por natureza (cache de vídeos, não dados pessoais).
- Índice GIN em `filtros` já suporta eficientemente `.contains('filtros', [...])`.
- Não existe pasta `supabase/migrations/` populada — o schema vive inteiramente em `supabase/schema.sql`, aplicado directamente (sem histórico de migrations incremental).
- **Nenhuma tabela `video_cache` no ambiente real foi confirmada como populada** — não há evidência no código de onde/quando a Edge Function `youtube-feed` escreve para `video_cache` (a função actual apenas faz proxy da chamada `search.list` e devolve a resposta bruta; não faz upsert em `video_cache`). Isto é uma questão em aberto.

**Tabela `profiles`** relevante para personalização — `filtros_dieteticos text[]`, com RLS `"profiles: só o próprio"` (`auth.uid() = id`).

## APIs Externas Relevantes

**YouTube Data API v3** (via `supabase/functions/youtube-feed/index.ts`):
- `search.list` custa 100 unidades/dia de quota (limite diário total: 10.000 unidades → só ~100 chamadas/dia no plano gratuito)
- Cache de 4h já definido na função (`CACHE_TTL_SECONDS = 14400`), consistente com a regra do `CLAUDE.md` ("YouTube cached até 4h")
- A função actual devolve a resposta bruta da API do YouTube, não o formato `VideoItem`; não persiste em `video_cache` — não é directamente utilizável pelo feed da homepage sem uma camada intermédia (fora do escopo deste research, a confirmar em `/plan` se é um processo distinto)

**react-native-reanimated-carousel** (avaliação para o carrossel, pesquisa externa):
- É a lib mais usada para exactamente este padrão (carrossel com item central em destaque, escala/overlay dos adjacentes, paginação por gesto ou botão)
- **Compatibilidade crítica com a stack fixada no `CLAUDE.md`:** a versão `4.x` (última: `4.0.3`) é construída sobre Reanimated `v2/v3` e é a versão compatível com a old architecture / `react-native-reanimated@3.17.4` já instalado no projecto. A `v5` (actualmente em beta pública) **requer Reanimated `4.1+` e `react-native-worklets`**, exactamente a combinação que o `CLAUDE.md` avisa ser incompatível com Expo 53 ("nunca instalar sem fixar: `react-native-reanimated@3.16.7`" / "4.x requer react-native-worklets, incompatível com Expo 53"). Logo, se esta lib for adoptada, **tem de ser fixada em `^4.0.3`**, nunca `^5`.
- Alternativa: implementar o carrossel manualmente sobre `Animated.FlatList`/`ScrollView` do `react-native-reanimated` com `useAnimatedScrollHandler` + interpolação de escala — mais controlo sobre o comportamento exacto pedido (autoplay, anel de progresso sincronizado, clique em card lateral), mas mais código próprio para manter.
- Ambas as opções são viáveis com as versões já instaladas; a escolha entre lib pronta vs. implementação manual fica para `/plan`.

Sources:
- [react-native-reanimated-carousel - npm](https://www.npmjs.com/package/react-native-reanimated-carousel)
- [Releases · dohooo/react-native-reanimated-carousel](https://github.com/dohooo/react-native-reanimated-carousel/releases)
- [GitHub - dohooo/react-native-reanimated-carousel](https://github.com/dohooo/react-native-reanimated-carousel)

## Code Snippets de Referência

Ver secção "Padrões de Implementação Existentes" acima — os snippets mais relevantes para reutilização directa são `useFeed.ts`, `getFeed()` e `Pill.tsx`.

## Questões em Aberto

1. **Formato do autoplay:** o ticket (`thoughts/shared/tickets/2026-07-23-homepage-feed-videos.md`) já assinala esta dúvida — "autoplay" significa apenas o anel de progresso visual sobre a thumbnail, ou implica reprodução real do vídeo/preview embutido no card? Não existe nenhum embed de player (YouTube/TikTok/Instagram) em nenhuma parte do código actual.
2. **Escolha do mecanismo de carrossel:** `react-native-reanimated-carousel@4.0.3` (pronto, mas API própria a aprender) vs. `Animated.FlatList` manual com `react-native-reanimated@3.17.4` (mais controlo, mais código). Nenhuma das duas está ainda decidida ou usada em nenhum outro ecrã do projecto.
3. **Personalização por `filtros_dieteticos`:** `getFeed()`/`useFeed()` actual só suporta **um** filtro exacto via `.contains`. Suportar (a) o filtro de categoria seleccionado pelo utilizador nas pills E (b) a reordenação/priorização pelos `filtros_dieteticos` do perfil, em simultâneo, requer estender a assinatura da query — por decidir a forma exacta (query com múltiplos `.contains`, ordenação client-side por nº de correspondências, ou RPC/view dedicada no Supabase).
4. **Onde e quando `video_cache` é preenchida:** a Edge Function `youtube-feed` não escreve na tabela; não há cron/job visível no repo que faça o upsert. Sem isto, os dados mock são o único conteúdo disponível até essa peça existir — a confirmar se está fora do escopo de F03 (parece estar, dado o ticket já assumir "dados mock inicialmente").
5. **Divergência de naming `VideoItem`:** o `CLAUDE.md` descreve `VideoItem` em camelCase, mas a implementação real (`packages/types/src/feed.ts`) usa snake_case a espelhar as colunas de `video_cache`. O `/plan` deve usar os tipos reais do package, não os do `CLAUDE.md`.
6. **Ajuste do `Pill` partilhado:** o ticket pede fundo `#2C3B4D` sólido no estado inactivo das pills; o componente `Pill.tsx` actual usa `transparent` + borda. Decidir se se altera o componente partilhado (impacto no onboarding, que já o usa) ou se a homepage usa uma variante própria.
7. **Limites de paginação/scroll infinito:** `getFeed` tem `limit=20` fixo; não há decisão sobre paginação do carrossel além deste limite — provavelmente aceitável para o MVP, a confirmar em `/plan`.
