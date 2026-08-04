# F03 — Homepage com feed de vídeos

Fonte: `thoughts/shared/plans/2026-07-23-homepage-feed-videos.md`

## Pré-requisitos
- [x] Conta com onboarding concluído (F02), login feito (F01)
- [x] Testar com um perfil que tenha `filtros_dieteticos` definidos (ex: `['vegan']`) e outro sem nenhum (array vazio)
- [x] `video_cache` pode estar vazia em desenvolvimento — o fallback para `MOCK_VIDEOS` é o comportamento **definitivo**, não um bug

## Testes automáticos / de código
- [x] `npx tsc --noEmit` sem erros
- [x] Confirmar `MOCK_VIDEOS` tem 12 entradas, cobre as 4 fontes (youtube/tiktok/instagram/emealia) e todos os filtros de categoria usados nas pills, sem campos `undefined`
- [x] `CarouselStrip.tsx`/`VideoCard.tsx`/`ProgressRing.tsx`/`SourceBadge.tsx` sob 150 linhas cada

## Testes manuais — fluxo feliz
1. [x] Abrir a homepage → carrossel aparece com o card central em escala 1.0 e borda âmbar; cards adjacentes a escala 0.82 com overlay escuro
2. [x] Ficar 4s sem tocar → anel de progresso do card central começa a animar em loop
3. [x] Tocar num card lateral → carrossel desliza até esse card ficar centrado; anel de progresso reinicia (para e só reaparece 4s depois)
4. [x] Tocar nas setas prev/next → avança/recua um card de cada vez
5. [x] Setas ficam desactivadas (opacidade reduzida) nos limites do conjunto (primeiro/último card) — sem loop infinito
6. [x] Trocar de pill de filtro (Todos/Rápidas/Vegan/Airfryer/Sobremesas) → vídeos visíveis mudam, carrossel volta ao primeiro card do subconjunto, dots/setas reflectem o novo conjunto
7. [x] Dots de navegação na base reflectem o card actualmente centrado

## Testes manuais — personalização e fallback
- [x] Perfil com `filtros_dieteticos = ['vegan']`: no filtro "Todos", vídeos vegan tendem a aparecer primeiro
- [x] Perfil sem `filtros_dieteticos` (array vazio): não crasha, ordenação client-side não falha com array vazio
- [x] Com `video_cache` vazia: app não fica em loading infinito nem crasha, mostra os `MOCK_VIDEOS`
- [x] Badges de fonte mostram a cor correcta por fonte: YouTube vermelho, TikTok preto, Instagram roxo, eMealia âmbar

## Testes manuais — casos de erro
- [x] Modo avião ao abrir a homepage → mensagem de erro clara em vez de spinner infinito (esta parte só existe depois de F12 — se testado antes, confirmar apenas que não crasha)

## Regressão a vigiar
- `Pill.tsx` foi ajustado globalmente nesta feature (fundo `#2C3B4D` sólido inactivo) — confirmar que `onboarding/step3.tsx` (F02) continua a renderizar as pills correctamente após esta alteração.
- `useFeed.ts` é estendido em F11 (filtro por criador seguido) — revalidar este conjunto de testes depois de F11 ser implementado.
