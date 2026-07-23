---
data: 2026-07-23
feature: "Homepage com Feed de Vídeos (F03)"
research: "thoughts/shared/research/2026-07-23-homepage-feed-videos.md"
status: completo
---

# Spec: Homepage com Feed de Vídeos (F03)

## Visão Geral
Substitui o placeholder de `apps/mobile/app/(tabs)/index.tsx` por um carrossel horizontal de vídeos portrait (9:16) com autoplay visual (anel de progresso SVG), pills de filtro de categoria, dots e setas de navegação, personalizado pelos `filtros_dieteticos` do perfil — construído com `Animated.FlatList` (`react-native-reanimated@3.17.4`, já instalado) em vez de uma lib de carrossel externa.

## Decisões tomadas (resolvem as questões em aberto do research)
1. **Mecanismo de carrossel:** `Animated.FlatList` manual com `useAnimatedScrollHandler` + interpolação de escala/opacidade — sem instalar `react-native-reanimated-carousel`.
2. **Pill partilhado:** `Pill.tsx` é ajustado globalmente para fundo `#2C3B4D` sólido no estado inactivo (afecta também `onboarding/step3.tsx`, que passa a usar o mesmo visual).
3. **Personalização por `filtros_dieteticos`:** reordenação **client-side** em `useFeed` — sem alterar `getFeed()`/schema Supabase.
4. **Dados mock vs. `video_cache`:** `useFeed` tenta sempre `video_cache` primeiro; se a query devolver 0 resultados (tabela ainda não populada em produção, conforme nota do research), usa o array mock local `MOCK_VIDEOS` filtrado pela mesma categoria — assim a UI funciona de imediato e passa a usar dados reais assim que `video_cache` for populada, sem exigir nenhuma flag ou branch de código a remover depois.
5. **Autoplay:** apenas visual — anel de progresso SVG animado em loop sobre o card central 4s depois de parar de interagir; sem embed de player (fora do escopo, conforme o ticket).
6. **Logo do header:** não existe nenhum asset de logo SVG no repositório (`src/assets/images/` está vazio de logos); seguir o padrão já usado em `onboarding/step1.tsx` — texto "eMealia" com `fonts.display`, não uma imagem.

## Ficheiros a Criar

### `apps/mobile/src/constants/mockFeed.ts`
**Propósito:** Array mock de `VideoItem[]` usado como fallback quando `video_cache` está vazia.
**Conteúdo:**
- Import `type { VideoItem } from '@emealia/types'`
- Exportar `export const MOCK_VIDEOS: VideoItem[] = [...]` com **12 items**, cobrindo as 4 fontes (`youtube`, `tiktok`, `instagram`, `emealia`) e todos os filtros de categoria usados nas pills (`rapida`, `vegan`, `airfryer`, `sobremesa` — pelo menos 2 vídeos por filtro, mais alguns sem nenhum desses filtros para o "Todos" ter mais itens que os subconjuntos)
- Campos snake_case exactos de `VideoItem` (`packages/types/src/feed.ts:5-17`): `id`, `youtube_id`, `titulo`, `canal`, `thumbnail_url` (usar URLs `https://picsum.photos/seed/{n}/405/720` como placeholders portrait 9:16), `duracao` (formato `"12:34"`), `views`, `publicado_em` (ISO string), `filtros`, `ingredientes_chave`, `cached_at`
- IDs únicos tipo `'mock-1'`..`'mock-12'`

### `apps/mobile/src/constants/feedFilters.ts`
**Propósito:** Definição única das pills de categoria da homepage (nome + `FiltroDietetico` correspondente).
**Conteúdo:**
```typescript
import type { FiltroDietetico } from '@emealia/types';

export interface FeedFilterOption {
  label: string;
  value: FiltroDietetico | null; // null = "Todos"
}

export const FEED_FILTER_OPTIONS: FeedFilterOption[] = [
  { label: 'Todos',      value: null },
  { label: 'Rápidas',    value: 'rapida' },
  { label: 'Vegan',      value: 'vegan' },
  { label: 'Airfryer',   value: 'airfryer' },
  { label: 'Sobremesas', value: 'sobremesa' },
];
```

### `apps/mobile/src/components/feed/SourceBadge.tsx`
**Propósito:** Badge colorido por `VideoSource`, para overlay no canto do `VideoCard`.
**Conteúdo:**
- Props: `{ fonte: VideoSource }`
- Mapa local `LABELS: Record<VideoSource, string>` → `{ youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', emealia: 'eMealia' }`
- Cor de fundo via `colors[fonte]` (já existem `colors.youtube`, `colors.tiktok`, `colors.instagram`, `colors.emealia` em `theme.ts:18-22`)
- `View` pequeno com `borderRadius: radius.sm`, `paddingHorizontal: 8`, `paddingVertical: 4`, texto `fonts.medium` tamanho 11, cor `colors.textInverted` (excepto `emealia` que deve usar `colors.primaryDark` para contraste sobre âmbar — usar `fonte === 'emealia' ? colors.primaryDark : colors.textInverted`)
- Sob 40 linhas

### `apps/mobile/src/components/feed/ProgressRing.tsx`
**Propósito:** Anel de progresso SVG animado, isolado do `VideoCard` para manter este último sob 150 linhas.
**Conteúdo:**
- Props: `{ size: number; strokeWidth?: number; active: boolean }`
- Usa `react-native-svg`: `Svg`, `Circle`; cria `Animated.createAnimatedComponent(Circle)` (import `Animated` de `react-native-reanimated`, não de `react-native`)
- `const progress = useSharedValue(0)`
- `useEffect(() => { if (active) { progress.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false); } else { cancelAnimation(progress); progress.value = withTiming(0, { duration: 200 }); } }, [active])`
- `useAnimatedProps` calcula `strokeDashoffset = circumference * (1 - progress.value)`, com `circumference = 2 * Math.PI * radius` calculado a partir de `size`/`strokeWidth`
- Círculo de fundo (`stroke={colors.border}`, opacidade baixa) + círculo animado (`stroke={colors.primary}`, `strokeLinecap="round"`, `transform` a rodar -90° para começar no topo)
- Renderiza `null`/apenas o container sem crash quando `active=false` (círculo simplesmente fica em 0)

### `apps/mobile/src/components/feed/VideoCard.tsx`
**Propósito:** Card individual do carrossel — thumbnail portrait 9:16, badge de fonte, título, canal, duração, borda âmbar quando activo, overlay escuro quando inactivo, `ProgressRing` sobreposto quando em autoplay.
**Conteúdo:**
- Props:
  ```typescript
  interface VideoCardProps {
    video: VideoItem;
    width: number;
    height: number;
    isActive: boolean;
    isAutoplaying: boolean;
    onPress: () => void;
  }
  ```
- `Pressable` de `width`×`height`, `borderRadius: radius.lg`, `overflow: 'hidden'`
- `borderWidth: isActive ? 3 : 0`, `borderColor: colors.primary`
- `Image` (de `react-native`, `resizeMode="cover"`) a preencher o card com `video.thumbnail_url`
- Overlay escuro semi-transparente (`View` absoluta `backgroundColor: 'rgba(0,0,0,0.45)'`) renderizado **apenas quando `!isActive`**
- `SourceBadge` posicionado `position: 'absolute'`, `top: 12`, `left: 12`
- Rodapé com `LinearGradient`-like fallback simples: `View` absoluta no fundo com `backgroundColor: 'rgba(0,0,0,0.6)'`, `padding: 12`, contendo `Text` (título, `fonts.semibold`, `colors.textInverted`, `numberOfLines={2}`) e `Text` (canal + duração, `fonts.regular`, tamanho 12, `colors.textMuted`)
- `ProgressRing` centrado (`position: 'absolute'`, `alignSelf: 'center'`, `top: '42%'`) com `active={isAutoplaying}`, `size={56}`
- Sob 150 linhas

### `apps/mobile/src/components/feed/CarouselStrip.tsx`
**Propósito:** O carrossel em si — `Animated.FlatList` horizontal com snap, escala/overlay dos adjacentes, setas prev/next, autoplay timer de 4s, e exposição do índice actual para os dots (renderizados no ecrã pai).
**Conteúdo:**
- Props:
  ```typescript
  interface CarouselStripProps {
    videos: VideoItem[];
    onIndexChange: (index: number) => void;
  }
  ```
- Usa `useWindowDimensions()` para calcular `CARD_WIDTH = Math.round(width * 0.6)`, `CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9))`, `ITEM_SPACING = 16`, `SNAP_INTERVAL = CARD_WIDTH + ITEM_SPACING`, `SIDE_INSET = (width - CARD_WIDTH) / 2`
- `const scrollX = useSharedValue(0)`
- `const [activeIndex, setActiveIndex] = useState(0)`
- `const [autoplayIndex, setAutoplayIndex] = useState<number | null>(null)`
- `const listRef = useAnimatedRef<Animated.FlatList<VideoItem>>()`
- `const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } })`
- Timer de autoplay: `useEffect` dependente de `activeIndex` e `videos.length` — `clearTimeout` anterior, `setAutoplayIndex(null)`, novo `setTimeout(() => setAutoplayIndex(activeIndex), 4000)`; `return () => clearTimeout(timer)`
- `scrollToIndex(index: number)`: calcula offset `index * SNAP_INTERVAL`, chama `listRef.current?.scrollToOffset({ offset, animated: true })`, e chama `setActiveIndex(index)` optimisticamente (o snap final também confirma via `onMomentumScrollEnd`)
- `onMomentumScrollEnd`: calcula `index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL)`, clamped a `[0, videos.length - 1]`, chama `setActiveIndex(index)` e `onIndexChange(index)`
- Renderiza `Animated.FlatList`:
  - `horizontal`, `data={videos}`, `keyExtractor={(v) => v.id}`
  - `snapToInterval={SNAP_INTERVAL}`, `decelerationRate="fast"`, `showsHorizontalScrollIndicator={false}`
  - `contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}`
  - `onScroll={scrollHandler}`, `scrollEventThrottle={16}`, `onMomentumScrollEnd={...}`
  - `renderItem={({ item, index }) => <CarouselItem item={item} index={index} scrollX={scrollX} cardWidth={CARD_WIDTH} cardHeight={CARD_HEIGHT} snapInterval={SNAP_INTERVAL} isActive={index === activeIndex} isAutoplaying={index === autoplayIndex} onPress={() => scrollToIndex(index)} />}`
- Sub-componente interno `CarouselItem` (mesmo ficheiro, função separada) que:
  - Cria `useAnimatedStyle` interpolando `scrollX` no intervalo `[(index-1)*snapInterval, index*snapInterval, (index+1)*snapInterval]` → `scale: [0.82, 1, 0.82]` e `opacity: [0.7, 1, 0.7]` via `interpolate` com `Extrapolation.CLAMP`
  - Envolve `VideoCard` num `Animated.View` com esse `style` (mais `marginHorizontal: ITEM_SPACING / 2`)
- Setas prev/next: dois `Pressable` posicionados `position: 'absolute'`, `top: '50%'`, `left: 8` / `right: 8`, com `Ionicons name="chevron-back"` / `"chevron-forward"` (de `@expo/vector-icons`, já presente em `node_modules`), `size={28}`, `color={colors.textInverted}`, fundo circular semi-transparente `rgba(27,38,50,0.6)`
  - `onPress` de "prev": `if (activeIndex > 0) scrollToIndex(activeIndex - 1)`
  - `onPress` de "next": `if (activeIndex < videos.length - 1) scrollToIndex(activeIndex + 1)`
  - `disabled`/`opacity: 0.3` quando no limite (sem loop infinito, conforme critério de aceitação)
- Sob 150 linhas (mover `CarouselItem` para cá é aceitável pois é um sub-componente de suporte directo, não uma nova responsabilidade — se ultrapassar 150 linhas, extrair `CarouselItem` para `apps/mobile/src/components/feed/CarouselItem.tsx`)

## Ficheiros a Modificar

### `apps/mobile/src/components/ui/Pill.tsx`
**Modificações:**
- [x] Linha 20: mudar `backgroundColor: selected ? colors.primary : 'transparent'` para `backgroundColor: selected ? colors.primary : colors.bgDarkAlt`
- [ ] Linha 19: manter `borderColor: selected ? colors.primary : colors.border` (sem alteração)
- Nenhuma outra alteração — o componente continua a ser usado tal como está em `onboarding/step3.tsx`

### `apps/mobile/src/hooks/useFeed.ts`
**Modificações:**
- [x] Assinatura passa a `export function useFeed(filtro?: FiltroDietetico, filtrosPerfil: FiltroDietetico[] = [])`
- [x] Adicionar import `import { MOCK_VIDEOS } from '@/constants/mockFeed';`
- [x] Dentro de `fetchFeed`, após obter `data` da query Supabase sem erro:
  - Se `data.length === 0`: usar `MOCK_VIDEOS.filter((v) => !filtro || v.filtros.includes(filtro))` como `baseVideos`
  - Caso contrário: `baseVideos = data as VideoItem[]`
- [x] Adicionar função local (não exportada) `function countMatches(videoFiltros: FiltroDietetico[], perfilFiltros: FiltroDietetico[]): number { return videoFiltros.filter((f) => perfilFiltros.includes(f)).length; }`
- [x] Antes de `setVideos`, ordenar: `const sorted = filtrosPerfil.length > 0 ? [...baseVideos].sort((a, b) => countMatches(b.filtros, filtrosPerfil) - countMatches(a.filtros, filtrosPerfil)) : baseVideos;` e `setVideos(sorted)`
- [x] `useEffect` dependency array passa a `[filtro, filtrosPerfil.join(',')]` (join para evitar loop infinito por nova referência de array a cada render — o array `filtrosPerfil` deve ser passado já estável pelo chamador, ver nota abaixo)
- [x] Manter toda a lógica de query Supabase existente (linhas 13-21) inalterada

### `apps/mobile/app/(tabs)/index.tsx`
**Modificações:** substituição completa do ficheiro (actualmente só placeholder de 9 linhas).
**Novo conteúdo:**
- Imports: `View`, `Text`, `useState` de `react`; `useAuth` de `@/hooks/useAuth`; `useProfile` de `@/hooks/useProfile`; `useFeed` de `@/hooks/useFeed`; `Pill` de `@/components/ui/Pill`; `CarouselStrip` de `@/components/feed/CarouselStrip`; `FEED_FILTER_OPTIONS` de `@/constants/feedFilters`; `colors, fonts, spacing` de `@/constants/theme`; `type { FiltroDietetico } from '@emealia/types'`
- `const { user } = useAuth();`
- `const { profile } = useProfile(user?.id);`
- `const [filtroSelecionado, setFiltroSelecionado] = useState<FiltroDietetico | null>(null);`
- `const filtrosPerfil = useMemo(() => profile?.filtros_dieteticos ?? [], [profile?.filtros_dieteticos]);` (usar `useMemo` — de `react` — para estabilizar a referência do array passado a `useFeed`, evitando o loop de `useEffect` mencionado acima; nota: `profile?.filtros_dieteticos` só muda de referência quando o Zustand store recebe um novo `Profile`, o que é seguro aqui)
- `const { videos, loading } = useFeed(filtroSelecionado ?? undefined, filtrosPerfil);`
- `const [activeIndex, setActiveIndex] = useState(0);`
- Ao trocar de pill (`onPress` de cada `Pill`): `setFiltroSelecionado(opcao.value); setActiveIndex(0);` (o reset do carrossel para o primeiro item acontece naturalmente porque `CarouselStrip` recebe uma nova lista `videos` via prop e é remontado — usar `key={filtroSelecionado ?? 'todos'}` no `CarouselStrip` para forçar reset do `FlatList`/`scrollX`/timer de autoplay ao mudar de filtro)
- Estrutura JSX:
  ```
  View (flex:1, backgroundColor: colors.bgDark)
    View (header: paddingTop safe + paddingHorizontal spacing.lg, paddingBottom spacing.md)
      Text "eMealia" (fonts.display, fontSize 24, color colors.primary)
    View (pills row: paddingHorizontal spacing.lg, flexDirection row, flexWrap wrap OU ScrollView horizontal showsHorizontalScrollIndicator=false)
      FEED_FILTER_OPTIONS.map(opcao => <Pill key={opcao.label} label={opcao.label} selected={filtroSelecionado === opcao.value} onPress={...} />)
    View (flex:1, justifyContent: 'center') -- área do carrossel
      {loading ? <ActivityIndicator color={colors.primary} /> : <CarouselStrip key={filtroSelecionado ?? 'todos'} videos={videos} onIndexChange={setActiveIndex} />}
    View (dots row: flexDirection row, justifyContent center, paddingVertical spacing.md)
      videos.map((_, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, marginHorizontal: 3, backgroundColor: i === activeIndex ? colors.primary : colors.border }} />)
  ```
- Usar `SafeAreaView` (de `react-native-safe-area-context`, já na stack) em vez de `View` simples no container raiz, para respeitar a status bar sobre `bgDark`

## Ficheiros a NÃO tocar (fora do escopo, confirmado no research/ticket)
- `packages/supabase/src/queries/feed.ts` — `getFeed()` mantém-se inalterado (usado apenas pelo hook, que já usa `supabase` client directamente em vez de `getFeed`; nenhuma duplicação nova introduzida)
- `supabase/functions/youtube-feed/index.ts` e qualquer processo de upsert em `video_cache` — back-office/cron, fora do escopo de F03
- `supabase/schema.sql` — sem alterações de schema necessárias

## Fases de Implementação

### Fase 1: Fundações — tipos, mock data, ajuste do Pill
**Ficheiros:**
- Criar `apps/mobile/src/constants/mockFeed.ts`
- Criar `apps/mobile/src/constants/feedFilters.ts`
- Modificar `apps/mobile/src/components/ui/Pill.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros no workspace `apps/mobile`
- [x] `MOCK_VIDEOS` tem 12 entradas com todos os campos de `VideoItem` preenchidos (sem `undefined`/`any`)

**Critérios de sucesso (manuais):**
- [ ] `onboarding/step3.tsx` ainda renderiza as pills correctamente, agora com fundo `#2C3B4D` visível no estado inactivo

### Fase 2: Componentes de feed isolados
**Ficheiros:**
- Criar `apps/mobile/src/components/feed/SourceBadge.tsx`
- Criar `apps/mobile/src/components/feed/ProgressRing.tsx`
- Criar `apps/mobile/src/components/feed/VideoCard.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` sem erros
- [x] Cada ficheiro sob 150 linhas

**Critérios de sucesso (manuais):**
- [ ] Renderizar `VideoCard` isoladamente (ex: numa storybook screen temporária ou directamente no ecrã) mostra thumbnail, badge com cor correcta por fonte, título/canal/duração legíveis, borda âmbar quando `isActive=true`, overlay escuro quando `isActive=false`
- [ ] Com `isAutoplaying=true`, o anel SVG anima em loop contínuo sem warnings de "Reanimated" na consola

### Fase 3: Carrossel e ligação de dados
**Ficheiros:**
- Criar `apps/mobile/src/components/feed/CarouselStrip.tsx`
- Modificar `apps/mobile/src/hooks/useFeed.ts`
- Modificar `apps/mobile/app/(tabs)/index.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` sem erros
- [x] `CarouselStrip.tsx` sob 150 linhas (ou `CarouselItem` extraído se exceder)

**Critérios de sucesso (manuais):**
- [ ] Abrir a homepage no simulador mostra o carrossel com card central em escala 1.0/borda âmbar e adjacentes a 0.82/overlay escuro
- [ ] Ao ficar 4s sem tocar, o anel de progresso do card central começa a animar
- [ ] Clicar num card lateral desliza o carrossel até esse card ficar centrado e reinicia o temporizador de autoplay (o anel pára e só reaparece 4s depois)
- [ ] Trocar de pill de filtro muda os vídeos visíveis, volta ao primeiro card do subconjunto, e as setas/dots reflectem o novo conjunto
- [ ] Setas prev/next avançam/recuam um card de cada vez e ficam desactivadas (opacidade reduzida) nos limites do conjunto filtrado, sem loop
- [ ] Dados aparecem mesmo sem `video_cache` populada (fallback para `MOCK_VIDEOS`) — confirmar visualmente que a app não fica em ecrã de loading infinito nem crasha se a tabela estiver vazia
- [ ] Se o utilizador tiver `filtros_dieteticos` no perfil (ex: `['vegan']`), os vídeos com esse filtro tendem a aparecer primeiro no conjunto "Todos"

## Estratégia de Testes
- **Unit:** não há suite de testes automatizados configurada no projecto para `apps/mobile` além de `tsc --noEmit` — validação nesta fase é manual no simulador, conforme critérios acima
- **Manual:** correr `npm run mobile` (raiz do monorepo) e testar os passos de Fase 3 acima em iOS Simulator; testar também com utilizador sem `filtros_dieteticos` definidos (array vazio) para confirmar que a ordenação client-side não crasha com `filtrosPerfil = []`

## Notas de Implementação
- **Quota YouTube/Spoonacular:** não aplicável nesta feature — o ecrã lê apenas de `video_cache` via Supabase, nunca chama `youtube-feed` directamente (regra do `CLAUDE.md` já respeitada, nenhuma chave de API no cliente)
- **`useMemo` em `filtrosPerfil`:** crítico para não criar loop de re-fetch em `useFeed` — o array teria uma nova referência a cada render se calculado inline sem `useMemo`
- **`key={filtroSelecionado ?? 'todos'}` no `CarouselStrip`:** é a forma mais simples de garantir reset total do `FlatList`, `scrollX` e do timer de autoplay ao trocar de filtro, sem precisar de `useImperativeHandle`/refs expostas — aceitar o custo de remount (a lista raramente tem mais de 20 itens, sem impacto de performance perceptível)
- **`react-native-reanimated-carousel` NÃO deve ser instalado** — decisão explícita desta spec, ver secção "Decisões tomadas"
- **GDPR:** nenhum dado pessoal novo é armazenado ou transmitido por esta feature; `filtros_dieteticos` já é lido de `profiles` com RLS existente, sem alterações de schema
- **Fallback mock→Supabase não é uma flag temporária a remover:** é o comportamento definitivo enquanto o processo de back-office que popula `video_cache` não existir; não adicionar comentários tipo "TODO remover quando video_cache estiver populada"

## Referências
- Research: `thoughts/shared/research/2026-07-23-homepage-feed-videos.md`
- Ticket original: `thoughts/shared/tickets/2026-07-23-homepage-feed-videos.md`
- Padrão de multi-select com Pill: `apps/mobile/app/onboarding/step3.tsx:83-92`
- Padrão de branding em texto: `apps/mobile/app/onboarding/step1.tsx:35-37`
- Query Supabase existente: `packages/supabase/src/queries/feed.ts:4-18`
- Hook de perfil: `apps/mobile/src/hooks/useProfile.ts`
