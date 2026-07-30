---
data: 2026-07-30
feature: "Integração com Apps de Saúde (F14)"
status: completo
---

# Research: Integração com Apps de Saúde (F14)

## Questão de Pesquisa
Como implementar a exportação de calorias e macros (proteínas, hidratos, gorduras) de refeições planeadas para o Apple Health (iOS) e Google Fit/Health Connect (Android), restrita a utilizadores Premium, com ecrã de configuração (toggle on/off + data do último sync) e sync automático diário — ver ticket `thoughts/shared/tickets/2026-07-30-integracao-apps-saude.md`. Investigar: (1) que biblioteca usar para HealthKit dado que `expo-health` não existe, (2) estado actual da Google Fit REST API, (3) onde persistir preferências de sync, (4) mecanismo mais fiável para sync diário automático.

## Sumário
Não existe nenhum código de saúde no repo hoje — é uma feature nova de raiz. A fonte de dados a exportar (`macro_daily_totals`) já existe e é preenchida por `useMacroDailyTotalsSync` (F10); falta apenas a camada de escrita para HealthKit/Health Connect e as preferências de sync. **A Google Fit REST API está fechada a novos integradores desde maio de 2024 e será desligada em 2026** — não deve ser usada; a alternativa recomendada pela própria Google é o **Health Connect**, via `react-native-health-connect`. Para iOS, `react-native-health` é a opção compatível com o stack actual (React 18.3.1/RN 0.76.7) sem forçar upgrades; a alternativa mais moderna (`@kingstinct/react-native-healthkit`) exige React 19/RN ≥0.79, incompatível com o projecto neste momento. Ambas as bibliotecas nativas exigem custom dev client via EAS Build (não funcionam em Expo Go) e config plugins dedicados. Não existe nenhum precedente de sync agendado/background no repo — seria capacidade nova a introduzir, com a alternativa mais simples e coerente com o padrão existente a ser um trigger em foreground (à semelhança de `useSyncManager.ts`), não um background task.

## Ficheiros Relevantes da Codebase

- `supabase/schema.sql:176-196` — tabela `macro_daily_totals` (F10), já persiste `calorias`/`proteinas`/`hidratos`/`gorduras`/`parcial` por `user_id`+`data`, `UNIQUE(user_id, data)`. É a fonte de dados a exportar — não recalcular a partir de `meal_plan`.
- `apps/mobile/src/hooks/useMacroDailyTotalsSync.ts` — hook que preenche `macro_daily_totals`; estilo de referência para um futuro `useHealthSync.ts`.
- `apps/mobile/app/(tabs)/profile.tsx:7-12,50-55` — ecrã de perfil composto por "sections" (`ProfileInfoSection`, `DietaryFiltersSection`, `LanguageSection`, `NotificationPrefsSection`, `PlanSection`, `PrivacySection`) renderizadas dentro de `Card`s num único `ScrollView`. Não há sub-ecrãs separados para configurações — tudo vive no mesmo ecrã.
- `apps/mobile/src/components/profile/NotificationPrefsSection.tsx` — padrão de toggle on/off a seguir: `Switch` de `@/components/ui/Switch`, merge do JSONB `notificacoes_prefs`, `updateProfile(supabase!, profile.id, { notificacoes_prefs: novo })`, depois `useProfileStore.getState().setProfile(data)`.
- `apps/mobile/app/macros.tsx:38,80-124` e `apps/mobile/app/(tabs)/planner.tsx:29-30,73` — padrão de gate Premium: `PLANS[profile.plano].features.<flag>` (sem hook dedicado tipo `usePremium`), `!podeAceder ? <PremiumLock/> : <>...</>`.
- `apps/mobile/src/components/paywall/PremiumLock.tsx` — componente reutilizável de bloqueio; redirecciona para `/(tabs)/profile?abrirUpgrade=1`, lido por `PlanSection.tsx:24,29-31` para abrir o `PaywallModal`.
- `packages/config/src/index.ts:21-52` — `PLANS.<plano>.features` (`planeamento_semanal`, `macros`, `export_lembretes`, `despensa_ilimitada`, `favoritos_ilimitados`); precisa de nova flag (ex: `sync_saude`) para gate desta feature.
- `packages/supabase/src/queries/profile.ts:8-14` — `updateProfile(client, userId, updates: Partial<Profile>)`, padrão a reutilizar se as preferências de sync forem colunas em `profiles`.
- `packages/supabase/src/queries/macro_daily_totals.ts` — `getMacroDailyTotals`/`upsertMacroDailyTotals`, padrão de tipagem via `Database['public']['Tables'][...]['Insert']`.
- `packages/supabase/src/index.ts` — barrel file, `export * from './queries/<novo>'` a adicionar para novas queries.
- `packages/types/src/user.ts:20-23,25-51` — `NotificacoesPrefs` (interface dedicada para JSONB) e `Profile` (acumula campos por feature: `expo_push_token` de F11, `idioma`/`notificacoes_prefs` de F13). Padrão a seguir para `HealthSyncPrefs`.
- `packages/types/src/database.ts:17-22,53-58` — mapeamento `Row`/`Insert`/`Update` por tabela, usa `Simplify<T>`; a actualizar se se criar tabela nova ou se estender `profiles`.
- `apps/mobile/app.json:31-46` — plugins Expo; exemplo mais próximo do padrão a seguir é `["expo-camera", {"cameraPermission": "..."}]` e `["expo-calendar", {"remindersPermission": "..."}]` (permissão dedicada + descrição em pt-PT). `ios.infoPlist` já tem `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSRemindersUsageDescription`. `android.permissions`: `["CAMERA", "READ_EXTERNAL_STORAGE"]`. Sem `newArchEnabled` explícito (logo, New Architecture fica no default do Expo 53, que é activada).
- `apps/mobile/eas.json` — perfis `development` (`developmentClient: true`), `preview`, `production`; build de dev client já suportado, nenhuma alteração estrutural necessária para adicionar módulos nativos.
- `apps/mobile/src/hooks/useSyncManager.ts:12-24` — único precedente de "sync automático" no repo, reactivo a `NetInfo.addEventListener` (não agendado por tempo). É a referência mais próxima de estilo para um trigger de sync diário em foreground.

## Padrões de Implementação Existentes

**Toggle Premium com merge de JSONB (F13, `NotificationPrefsSection.tsx`):**
```ts
// padrão a replicar para o toggle de sync de saúde
async function toggleNotif(chave: keyof NotificacoesPrefs, valor: boolean) {
  const novo = { ...profile.notificacoes_prefs, [chave]: valor };
  const { data, error } = await updateProfile(supabase!, profile.id, { notificacoes_prefs: novo });
  if (!error && data) useProfileStore.getState().setProfile(data);
}
```

**Gate Premium (`macros.tsx`):**
```ts
const podeAceder = profile ? PLANS[profile.plano].features.macros : false;
// ...
{!podeAceder ? <PremiumLock mensagem={...} /> : <>{/* conteúdo */}</>}
```

**Hook de sync write-only (`useMacroDailyTotalsSync.ts`), estilo a seguir para `useHealthSync.ts`:**
```ts
useEffect(() => {
  if (!userId || !enabled) return;
  const uid = userId;
  let cancelado = false;
  async function sincronizar() {
    const dados = /* ler macro_daily_totals do dia */;
    if (cancelado) return;
    // escrever no HealthKit/Health Connect
  }
  sincronizar();
  return () => { cancelado = true; };
}, [userId, enabled /*, ... */]);
```

**Query Supabase (`packages/supabase/src/queries/profile.ts`):**
```ts
export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  updates: Partial<Profile>
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```

## Tabelas/Queries Supabase Relevantes

- **`macro_daily_totals`** (existe, F10) — fonte de dados a exportar. `user_id`, `data`, `calorias`, `proteinas`, `hidratos`, `gorduras`, `parcial`, `UNIQUE(user_id, data)`. RLS: `auth.uid() = user_id`.
- **`profiles`** (existe) — candidato a receber colunas novas (`sync_saude_activo boolean`, `sync_saude_ultimo_em timestamptz`, `sync_saude_plataforma text`), seguindo o precedente de `expo_push_token` (F11) e `idioma`/`notificacoes_prefs` (F13). Alternativa: tabela dedicada `health_sync_settings` — a decidir em `/plan`, sem precedente forte num sentido ou noutro (a maioria das preferências simples já vive em `profiles`; JSONB tipo `notificacoes_prefs` é outra opção se o número de campos crescer).
- Nenhuma tabela nova é estritamente necessária para os dados a exportar (já cobertos por `macro_daily_totals`) — só para as preferências de sync, se se optar por não estender `profiles`.
- Sem precedente de `pg_cron`/schedule no schema — qualquer automação teria de ser client-side (não é possível o Supabase escrever directamente no HealthKit/Health Connect de um dispositivo, por serem APIs on-device).

## APIs Externas Relevantes

**Apple HealthKit (iOS)**
- Sem SDK Expo oficial. Duas bibliotecas React Native avaliadas:
  - **`react-native-health`** (agencyenterprise) — **recomendada para este stack**. `peerDependencies: react-native >= 0.67.3`, compatível com RN 0.76.7 sem upgrades. Escrita via `AppleHealthKit.saveFood({ foodName, mealType, date, energy, protein, carbohydrates, fatTotal, ... }, callback)` — mapeia para `dietaryEnergyConsumed`/`dietaryProtein`/`dietaryCarbohydrates`/`dietaryFatTotal`. Inclui config plugin Expo (`app.plugin.js`) que gera `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` e entitlement `com.apple.developer.healthkit`. Manutenção activa mas conservadora (maintainers focados em reescrita Swift, sem features novas previstas a curto prazo). Requer custom dev client via EAS — não corre em Expo Go.
  - **`@kingstinct/react-native-healthkit`** — mais moderno (releases frequentes), mas desde a v11 exige `react-native-nitro-modules` + `react >= 19`, `react-native >= 0.79`. **Incompatível** com o stack actual (React 18.3.1/RN 0.76.7) sem upgrade major do projecto primeiro. A última versão com peer deps abertos (10.1.0) está em EOL. Não recomendada enquanto o projecto não migrar para Expo 54+/RN 0.79+/React 19.

**Google Fit REST API (Android) — DESCONTINUADA**
- Confirmado em `developers.google.com/fit`/`fit/rest`: "As of May 1, 2024, developers cannot sign up to use these APIs" e deprecação total anunciada para 2026 (sem data exacta divulgada). **Não deve ser usada nesta feature**, apesar de ter sido mencionada no pedido original — a própria Google recomenda migração para Health Connect.

**Health Connect (Android) — alternativa recomendada**
- Pacote: **`react-native-health-connect`** (matinzd), activamente mantido (v3.5.3, mai 2026). `peerDependencies` abertos (`react: "*"`, `react-native: "*"`), mas implementado como **TurboModule** — exige New Architecture (é o default no Expo 53 deste projecto, sem override em `app.json`, pelo que deve já estar activa).
- Escrita via `insertRecords()` com `NutritionRecord { energy, protein, totalCarbohydrate, totalFat, ... }`.
- Permissões: `android.permission.health.WRITE_NUTRITION` / `READ_NUTRITION`.
- `minSdkVersion 26` (Android 8.0+); a partir do Android 14 o Health Connect já vem no framework, em versões anteriores requer a app "Health Connect by Android" instalada separadamente.
- Config plugin Expo separado: **`expo-health-connect`** (mesmo autor) + `expo-build-properties` para fixar `compileSdkVersion`/`targetSdkVersion 35`.
- **Risco de timeline**: para publicar na Play Store com escrita de dados de saúde é preciso submeter um formulário de declaração à Google — aprovação até 7 dias + mais 5-7 dias úteis de propagação até à whitelist chegar aos servidores Health Connect. Isto pode atrasar o lançamento em ~2 semanas face à submissão normal.

**Config plugins e EAS (ambas as plataformas)**
- Nenhuma das bibliotecas funciona em Expo Go — obrigam a `eas build --profile development` (dev client custom) e a `expo prebuild` implícito.
- iOS: chaves de permissão a adicionar em `app.json` via plugin (`healthSharePermission`/`healthUpdatePermission` nas opções do plugin `react-native-health`), seguindo o padrão já usado para `expo-camera`/`expo-calendar`.
- Android: permissões `WRITE_NUTRITION`/`READ_NUTRITION` a declarar no manifest via config plugin; sintaxe exacta do manifest não confirmada (página de docs do projecto devolveu 404 na pesquisa) — validar directamente no repo do `react-native-health-connect` antes de implementar.

## Code Snippets de Referência

Ver secção "Padrões de Implementação Existentes" acima — não foram encontrados snippets de código de saúde no repo (feature nova de raiz).

## Questões em Aberto

1. **Estrutura de dados das preferências de sync**: estender `profiles` com colunas simples (`sync_saude_activo`, `sync_saude_ultimo_em`, `sync_saude_plataforma`) seguindo o precedente de F11/F13, ou criar uma tabela dedicada `health_sync_settings`? Não há um padrão forte a favor de nenhuma das duas no repo actual — decidir em `/plan`.
2. **`react-native-health` vs. esperar por `@kingstinct/react-native-healthkit`**: o pedido original (ticket) não especifica biblioteca. `react-native-health` é a única opção iOS compatível com o stack actual sem forçar upgrade a React 19/RN 0.79 — confirmar que este trade-off (biblioteca em manutenção conservadora, sem features novas) é aceitável antes de avançar para `/plan`.
3. **Divergência do pedido original quanto ao Google Fit**: o ticket pede explicitamente "Google Fit REST API", mas essa API está fechada a novos integradores desde 2024 e será desligada em 2026. Confirmar com o utilizador que Health Connect (via `react-native-health-connect` + `expo-health-connect`) é aceite como substituto antes de avançar — é uma mudança de âmbito técnico relevante face ao ticket original.
4. **Timeline de aprovação Health Connect na Play Store**: o formulário de declaração de dados de saúde da Google (até 7 dias de aprovação + 5-7 dias de propagação) tem de ser submetido e aprovado antes do lançamento da feature em produção Android — impacto de planeamento a considerar, não um bloqueio técnico de implementação.
5. **Mecanismo de sync diário automático**: não há precedente de background task no repo. Confirmar em `/plan` se o sync diário é: (a) disparado em foreground quando a app abre e detecta que o dia ainda não foi sincronizado (mais simples, consistente com `useSyncManager.ts`, mas depende do utilizador abrir a app), ou (b) via `expo-task-manager`/`expo-background-fetch` (mais robusto mas introduz complexidade nova, pouco fiável em iOS para trabalho agendado a horas fixas).
6. **Nova flag em `PLANS.features`**: confirmar nome (`sync_saude` sugerido) a adicionar a `packages/config/src/index.ts` para os três planos, seguindo o padrão de `macros`/`planeamento_semanal`.
7. **Confirmar sintaxe exacta do manifest Android** para as permissões `WRITE_NUTRITION`/`READ_NUTRITION` do `react-native-health-connect` diretamente no repo da biblioteca antes de implementar (página de docs consultada devolveu 404 durante a pesquisa).
