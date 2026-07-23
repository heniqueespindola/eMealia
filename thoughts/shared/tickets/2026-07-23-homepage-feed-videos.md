---
data: 2026-07-23
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Homepage com Feed de Vídeos

## Contexto
Após autenticação (F01) e onboarding (F02), o utilizador precisa de um ecrã inicial que apresente sugestões de receitas de forma imediata e apelativa, sem exigir pesquisa activa. Esta é a feature F03 do MVP (`app/(tabs)/index.tsx`) — um carrossel de vídeos em destaque, no espírito de "scroll descoberta" (semelhante a TikTok/Reels, mas em formato horizontal com card central em foco), que agrega conteúdo de YouTube, TikTok, Instagram e receitas próprias eMealia. O feed deve reflectir os `filtros_dieteticos` definidos no perfil do utilizador durante o onboarding, tornando as sugestões imediatamente relevantes.

## Comportamento esperado

**Carrossel horizontal de cards (portrait 9:16)**
**Dado que** o utilizador abre a homepage
**Quando** o feed carrega
**Então** vê um carrossel horizontal de cards de vídeo em formato portrait (9:16), com o card central em destaque (escala 1.0, borda âmbar `#FFB162`) e os cards adjacentes em escala reduzida (0.82) com overlay escuro

**Autoplay do card central**
**Dado que** um card está centrado no carrossel
**Quando** decorrem 4 segundos sem interacção
**Então** o vídeo desse card entra em autoplay, exibindo um anel de progresso SVG animado sobre o card

**Navegação por clique num card lateral**
**Dado que** o utilizador vê cards laterais (não centrados)
**Quando** clica num desses cards
**Então** o carrossel desliza até esse card ficar centrado, reiniciando o temporizador de autoplay

**Filtros de categoria (pills)**
**Dado que** o utilizador vê a fila de pills de filtro (Todos, Rápidas, Vegan, Airfryer, Sobremesas) por baixo do header
**Quando** selecciona um filtro diferente do actual
**Então** o carrossel é filtrado para mostrar apenas os cards correspondentes, a pill seleccionada muda para fundo âmbar `#FFB162` (as restantes mantêm fundo `#2C3B4D`), o carrossel volta ao primeiro card do subconjunto filtrado, e o autoplay reinicia

**Badges de fonte**
**Dado que** cada card de vídeo tem uma fonte de origem
**Quando** o card é renderizado
**Então** exibe um badge com a cor correspondente à fonte (YouTube `#FF0000`, TikTok `#010101`, Instagram `#C13584`, eMealia `#FFB162`)

**Navegação complementar**
**Dado que** o utilizador está a ver o carrossel
**Quando** olha para a base do ecrã ou para as laterais
**Então** vê dots de navegação indicando a posição actual no conjunto filtrado, e setas de prev/next para avançar/recuar sem gesto de swipe

**Personalização por perfil**
**Dado que** o utilizador tem `filtros_dieteticos` definidos no perfil (do onboarding)
**Quando** a homepage carrega pela primeira vez numa sessão
**Então** o feed é pré-filtrado/ordenado priorizando vídeos cujos `filtros` coincidam com `filtros_dieteticos` do perfil (sem esconder o resto do conteúdo)

## Critérios de aceitação
- [ ] Ecrã `app/(tabs)/index.tsx` com header de fundo `#1B2632` (bgDark) e logo eMealia
- [ ] Carrossel horizontal com cards portrait (9:16): card central escala 1.0 com borda âmbar `#FFB162`; cards adjacentes escala 0.82 com overlay escuro semi-transparente
- [ ] Autoplay do card central após 4 segundos de inactividade, com anel de progresso SVG animado (usando `react-native-svg`)
- [ ] Clique num card lateral anima o carrossel até esse card ficar centrado e reinicia o temporizador de autoplay
- [ ] Fila de pills de filtro horizontais: "Todos", "Rápidas", "Vegan", "Airfryer", "Sobremesas" — fundo `#2C3B4D` (inactivo) / `#FFB162` (activo)
- [ ] Selecção de pill filtra os cards visíveis, reinicia posição do carrossel para o primeiro item do subconjunto e reinicia o autoplay
- [ ] Badge de fonte em cada card com cor correcta por `VideoSource` (`youtube` `#FF0000`, `tiktok` `#010101`, `instagram` `#C13584`, `emealia` `#FFB162`)
- [ ] Dots de navegação na base reflectindo a posição no conjunto filtrado actual
- [ ] Setas prev/next funcionais, respeitando os limites do conjunto filtrado (sem loop infinito, salvo decisão em contrário)
- [ ] Dados mock iniciais (array local de `VideoItem[]`) a funcionar de ponta a ponta antes de qualquer ligação ao Supabase
- [ ] Ligação a `video_cache` no Supabase substitui os dados mock, mapeando os campos da tabela para o tipo `VideoItem`
- [ ] Feed pondera/ordena por `filtros_dieteticos` do `profiles` do utilizador autenticado
- [ ] Cores e fontes exclusivamente via `src/constants/theme.ts` (tokens `colors`/`fonts`), nunca hardcoded nos componentes
- [ ] Componentes `VideoCard`, `CarouselStrip` e `SourceBadge` extraídos para `src/components/feed/`, cada um sob 150 linhas
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Reutilizar/criar `src/hooks/useFeed.ts` para encapsular a lógica de obtenção do feed (mock → Supabase) e o estado de filtro activo, mantendo o componente de ecrã magro
- O anel de progresso do autoplay deve ser implementado com `react-native-svg` (arco animado), não com bibliotecas adicionais — reforça a stack já definida no projecto
- Avaliar se a transição de escala/overlay do carrossel usa `react-native-reanimated@3.x` (já na stack) para animações performantes — confirmar na fase de plan/implement
- A tabela `video_cache` já tem colunas `filtros` (text[]) e pode ser directamente mapeada para `VideoItem.filtros` (tipo `FiltroDietetico[]`); confirmar mapeamento exacto dos restantes campos (`youtube_id`→`youtubeId`, `canal`→`canal`, `duracao`→`duracao`, etc.)
- Autoplay real de vídeo (reprodução do conteúdo, não apenas o anel de progresso) não está detalhado neste ticket — confirmar em `/research` se nesta fase o "autoplay" é apenas visual (anel + thumbnail) ou se implica reprodução efectiva do vídeo/preview (o que teria implicações de custo/quota nas APIs YouTube/TikTok/Instagram)
- Personalização por `filtros_dieteticos`: decidir em plan/implement se é reordenação (prioriza correspondências) ou filtragem (esconde não-correspondências) — este ticket assume reordenação, mantendo "Todos" como filtro por omissão
- Considerar paginação/infinite scroll do carrossel caso `video_cache` tenha muitos registos — fora do MVP inicial se não especificado

## Fora do escopo
- Reprodução efectiva de vídeo dentro do card (embed de player YouTube/TikTok/Instagram) — este ticket cobre apenas o carrossel, autoplay visual (anel de progresso) e navegação
- Edição/gestão do `video_cache` (isso é um processo de back-office/cron separado, não parte deste ecrã)
- Pesquisa por ingredientes (F04) e ecrã de despensa (F05)
- Feed na app web (`apps/web/`)
- Partilha social de vídeos ou comentários

## Próximo passo
/research Como estruturar o carrossel de vídeos da homepage em Expo Router (`app/(tabs)/index.tsx`), incluindo a lógica de escala/overlay dos cards adjacentes, o anel de progresso SVG do autoplay, a gestão de estado do filtro de categoria com `react-native-reanimated`, e a transição de dados mock para a tabela `video_cache` do Supabase com personalização por `filtros_dieteticos`?
