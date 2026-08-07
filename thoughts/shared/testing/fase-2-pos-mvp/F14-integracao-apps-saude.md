# F14 — Integração com Apps de Saúde

Fonte: `thoughts/shared/plans/2026-07-30-integracao-apps-saude.md`

## Pré-requisitos
- [x] ⚠️ Requer dev client custom via EAS Build (`eas build --profile development`) — HealthKit e Health Connect têm módulos nativos, **não funcionam em Expo Go**
- [x] iOS: dispositivo físico ou simulador com iOS recente (HealthKit tem suporte limitado de escrita/leitura em alguns simuladores) — app "Saúde" instalada
- [x] Android: dispositivo/emulador com a app "Health Connect by Android" instalada (obrigatória em Android < 14; integrada no SO a partir do Android 14)
- [x] SQL da Fase 1 corrido: `profiles.sync_saude_activo` (default `false`), `profiles.sync_saude_ultimo_em`, `profiles.sync_saude_plataforma`
- [x] Conta de teste `premium_monthly` ou `premium_annual` (feature gated por `PLANS[...].features.sync_saude`)
- [x] Conta de teste `free` para validar o bloqueio
- [x] Pelo menos um dia com refeições planeadas no Planeador (F09) com `macro_daily_totals` já calculado (F10), para testar a exportação de dados reais
- [x] Capacidade de alterar a data do dispositivo (Definições do sistema) para testar o sync automático do "dia seguinte" sem esperar 24h reais

## Testes automáticos / de código
- [x] `cd apps/mobile && npx tsc --noEmit` sem erros (ignorar o erro pré-existente e não relacionado de `@types/react`, já documentado no plano)
- [x] `cd apps/mobile && npm run lint` — 0 erros; os únicos warnings esperados são `react-hooks/exhaustive-deps` em `useHealthSync.ts` e `no-require-imports` (×2) em `src/lib/health/index.ts` (exigidos pelo `require()` condicional por plataforma — não corrigir com `eslint-disable`, não há precedente no projecto)
- [x] Confirmar em `apps/mobile/src/lib/health/index.ts` que `getHealthAdapter()` usa `require()` dentro de cada branch `if (Platform.OS === ...)` e nunca `import` estático dos dois adaptadores no topo do ficheiro (evita o Metro resolver o módulo nativo da plataforma errada)
- [x] `HealthSyncSection.tsx` sob 150 linhas (regra `CLAUDE.md`)
- [x] `npx expo config --type prebuild` resolve os plugins `expo-health-connect` e `expo-build-properties` sem erros

## Testes manuais — gate Premium
- [x] Conta `free` → secção "Sincronização com apps de saúde" mostra `PremiumLock`, sem toggle nem opção de activar
- [x] Conta Premium → secção mostra o `Card` completo com toggle, plataforma detectada e estado do último sync

## Testes manuais — autorização e activação (iOS)
- [x] Conta Premium, dev client iOS → activar o toggle → aparece o prompt nativo do HealthKit a pedir permissão de escrita para calorias/proteínas/hidratos/gorduras
- [x] Conceder autorização → toggle fica ligado, `sync_saude_activo = true`, plataforma gravada como `ios`
- [ ] Negar autorização → toggle permanece desligado, mensagem de erro (`healthSync.autorizacaoNegada`), `sync_saude_activo` continua `false`

## Testes manuais — autorização e activação (Android)
- [ ] Conta Premium, dev client Android ≥ 14 (ou com app companion instalada) → activar o toggle → aparece o prompt nativo do Health Connect
- [ ] Conceder autorização → toggle fica ligado, `sync_saude_activo = true`, plataforma gravada como `android`
- [ ] Negar autorização → toggle permanece desligado, mensagem de erro, `sync_saude_activo` continua `false`
- [ ] Android < 14 sem a app "Health Connect by Android" instalada → comportamento não trava a app (idealmente indica que é preciso instalar a app companion)

## Testes manuais — exportação de dados
- [x] Utilizador Premium **sem** refeições planeadas hoje → activar toggle → autorização concedida → "última sincronização" fica preenchida, mas sem nenhum registo nutricional novo no Apple Health/Health Connect (nada para exportar nesse dia)
- [x] Utilizador Premium **com** refeições planeadas hoje (macro_daily_totals preenchido) → activar toggle → confirmar na própria app Saúde (iOS) ou Health Connect (Android) que aparece um registo nutricional com os valores de calorias/proteínas/hidratos/gorduras correspondentes ao total diário planeado na eMealia
- [x] Confirmar que os valores exportados batem certo com o que é mostrado no Dashboard de Macros (F10) para o mesmo dia

## Testes manuais — sync automático diário
- [x] Com o toggle já activo e um sync feito hoje, reabrir a app várias vezes no mesmo dia → não dispara um novo sync (nem novo registo duplicado no Health/Connect)
- [x] Alterar a data do dispositivo para o dia seguinte (ou aguardar a passagem real de dia) e reabrir a app → sync automático dispara sem qualquer acção manual do utilizador, "última sincronização" actualiza para a nova data
- [x] Confirmar que não há registos duplicados no Health/Connect para o mesmo dia após múltiplas aberturas da app

## Testes manuais — desactivação
- [x] Desligar o toggle → `sync_saude_activo` passa a `false` sem erros na UI
- [x] Confirmar que os registos já escritos anteriormente no Apple Health / Health Connect **permanecem** (a app não tenta apagá-los — fora do controlo da eMealia)
- [x] Reactivar o toggle mais tarde → volta a pedir autorização (ou reutiliza a já concedida, consoante o comportamento do SO) e retoma o sync normalmente

## Verificação de dados (Supabase)
```sql
select id, sync_saude_activo, sync_saude_ultimo_em, sync_saude_plataforma
from profiles
where id = '<id de teste>';
```

## Regressão a vigiar
- `useHealthSync` lê de `macro_daily_totals` (F10) — confirmar que alterações a essa tabela por F09/F10 continuam a alimentar correctamente a exportação.
- `profile.tsx` ganhou mais uma secção (`HealthSyncSection`, entre `PlanSection` e `PrivacySection`) — confirmar visualmente que o layout do ecrã de Perfil (F13) não quebrou com a secção adicional (scroll, espaçamento).
- Instalação de dependências nativas novas (`react-native-nitro-modules`, `expo-build-properties` com `compileSdkVersion`/`targetSdkVersion 35`) pode afectar o build de outras features com módulos nativos (câmara/scanner de F05, notificações push de F15) — depois de instalar, correr um smoke test rápido de F05 (scanner de código de barras) e F15 (permissão de push) no mesmo build.
