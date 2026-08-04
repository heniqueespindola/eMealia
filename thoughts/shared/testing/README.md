# eMealia — Plano de Testes (Mobile)

> Gerado a partir de `thoughts/shared/plans/`, `thoughts/shared/research/`, `thoughts/shared/tickets/` e `FEATURES.md`.
> Cobre **apenas a app mobile** (`apps/mobile`) — a app web (`apps/web`) ainda não existe.

## Como está organizado

Os testes estão divididos em duas pastas, espelhando as fases de implementação de `FEATURES.md`:

```
thoughts/shared/testing/
├── fase-1-mvp/          F01–F08 (MVP)
├── fase-2-pos-mvp/       F09–F15 (Pós-MVP) — completo
└── README.md             (este ficheiro)
```

Cada ficheiro de feature (`FXX-nome-feature.md`) contém:
1. **Pré-requisitos** — estado de conta/dados necessário antes de testar
2. **Testes automáticos / de código** — o que pode ser corrido via terminal (`tsc`, `lint`, SQL, `curl` a Edge Functions, testes unitários de funções puras a criar)
3. **Testes manuais — fluxo feliz** — o caminho principal de negócio
4. **Testes manuais — casos de erro e limites** — validações, mensagens de erro, limites de plano
5. **Testes manuais — regressão** — pontos de integração com outras features que podem partir
6. **Verificação de dados (Supabase)** — queries SQL para confirmar o resultado na base de dados

## Pré-requisitos gerais (todas as features)

- [ ] `cd apps/mobile && npx expo start` a correr, app aberta em simulador iOS/Android **ou** dispositivo físico (algumas features — câmara, notificações push, HealthKit/Health Connect, compras in-app — só funcionam em dispositivo físico ou dev client, nunca em Expo Go)
- [ ] Acesso ao Supabase Dashboard (SQL Editor + Table Editor) do projecto de desenvolvimento, para verificação de dados
- [ ] Pelo menos 2 contas de teste: uma no plano `free`, outra `premium_monthly`/`premium_annual` (mudar `profiles.plano` directamente na BD é aceitável — RevenueCat sandbox não é obrigatório para testar a maior parte das features)
- [ ] `npm run typecheck` e `npm run lint` (raiz do monorepo) correm sem erros antes de iniciar testes manuais — apanha regressões óbvias mais depressa que testar manualmente
- [ ] Ligação à internet controlável (modo avião) para testes de F12 (offline) e mensagens de erro de rede noutras features

## Notas importantes

- **Sem framework de testes automatizado configurado no projecto** (confirmado em todos os planos — nenhum Jest/RNTL/Vitest). Os "testes automáticos" listados nestes documentos são maioritariamente: `tsc --noEmit`, `expo lint`, verificação de SQL/schema, e chamadas `curl` diretas a Edge Functions. Onde uma função é pura (sem I/O) e vale a pena testar isoladamente, isso é assinalado como **candidato a teste unitário** caso um framework venha a ser introduzido.
- **Ordem sugerida de execução**: seguir a ordem F01→F08 (Fase 1) e depois F09→F15 (Fase 2), porque features posteriores dependem de dados criados por features anteriores (ex: F06 Favoritos precisa de receitas guardadas via F04; F09 Planeamento precisa de F06/F04; F10 Macros precisa de F09).
- **Contas de teste com plano trocado manualmente**: em vários pontos, os planos de implementação assumem que testar limites Premium/Grátis pode ser feito editando `profiles.plano` directamente no Supabase Studio, sem depender de compras sandbox reais — usar essa abordagem sempre que o teste não for especificamente sobre o fluxo de pagamento em si (esse fica isolado em F08).
- **Dependências externas**: várias features dependem de infraestrutura fora do repositório (processo que popula `video_cache`/`creators.channel_id`, RevenueCat dashboard configurado, dev client custom via EAS Build). Onde isso bloqueia um teste, está assinalado explicitamente com ⚠️.

## Índice — Fase 1 (MVP)

| # | Feature | Ficheiro |
|---|---|---|
| F01 | Autenticação | `fase-1-mvp/F01-autenticacao.md` |
| F02 | Onboarding | `fase-1-mvp/F02-onboarding.md` |
| F03 | Homepage — feed de vídeos | `fase-1-mvp/F03-homepage-feed-videos.md` |
| F04 | Pesquisa por ingredientes | `fase-1-mvp/F04-pesquisa-por-ingredientes.md` |
| F05 | Despensa | `fase-1-mvp/F05-despensa.md` |
| F06 | Favoritos e coleções | `fase-1-mvp/F06-favoritos-e-coleccoes.md` |
| F07 | Lista de compras automática | `fase-1-mvp/F07-lista-de-compras.md` |
| F08 | Planos e pagamentos (RevenueCat) | `fase-1-mvp/F08-planos-e-pagamentos.md` |

## Índice — Fase 2 (Pós-MVP)

| # | Feature | Ficheiro |
|---|---|---|
| F09 | Planeamento semanal | `fase-2-pos-mvp/F09-planeamento-semanal.md` |
| F10 | Macros avançadas | `fase-2-pos-mvp/F10-macros-avancadas.md` |
| F11 | Criadores em destaque | `fase-2-pos-mvp/F11-criadores-em-destaque.md` |
| F12 | Modo offline básico | `fase-2-pos-mvp/F12-modo-offline-basico.md` |
| F13 | Perfil e configurações + i18n | `fase-2-pos-mvp/F13-perfil-e-configuracoes.md` |
| F14 | Integração com apps de saúde | `fase-2-pos-mvp/F14-integracao-apps-saude.md` |
| F15 | Notificações inteligentes | `fase-2-pos-mvp/F15-notificacoes-inteligentes.md` |
