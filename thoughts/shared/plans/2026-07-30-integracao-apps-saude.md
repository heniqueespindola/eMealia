---
data: 2026-07-30
feature: "Integração com Apps de Saúde (F14)"
research: "thoughts/shared/research/2026-07-30-integracao-apps-saude.md"
status: completo
---

# Spec: Integração com Apps de Saúde (F14)

## Visão Geral
Ecrã de configuração Premium em `profile.tsx` com toggle de sincronização de calorias/macros diárias (`macro_daily_totals`) para Apple Health (iOS, via `@kingstinct/react-native-healthkit`) e Health Connect (Android, via `react-native-health-connect`), com sync automático em foreground uma vez por dia.

## Decisões confirmadas nesta fase (divergem da research/ticket original)

1. **Android: Health Connect em vez de Google Fit REST API.** A API pedida no ticket original está fechada a novos integradores desde 2024 e será desligada em 2026. Usa-se `react-native-health-connect` + `expo-health-connect` (config plugin), conforme recomendado pela própria Google.
2. **Preferências de sync:** estendem `profiles` (colunas `sync_saude_activo`, `sync_saude_ultimo_em`, `sync_saude_plataforma`), seguindo o precedente de `expo_push_token` (F11) e `idioma`/`notificacoes_prefs` (F13). Sem tabela dedicada.
3. **Mecanismo de sync diário:** trigger em foreground (mesmo padrão de `useSyncManager.ts`) — ao abrir a app, se `sync_saude_ultimo_em` não é hoje, sincroniza automaticamente. Sem `expo-task-manager`/background fetch.
4. **Biblioteca iOS:** `@kingstinct/react-native-healthkit` (não `react-native-health`). A research assumiu React 18.3.1/RN 0.76.7 (desactualizado face ao `CLAUDE.md`) — o `apps/mobile/package.json` real já tem **React 19.0.0 / React Native 0.79.6**, que satisfaz os peer deps da biblioteca moderna (`react-native-nitro-modules`, React ≥19, RN ≥0.79). É activamente mantida, ao contrário de `react-native-health`.
5. **Nova flag Premium:** `sync_saude` em `PLANS.<plano>.features`.

## Dependências a instalar

Em `apps/mobile/package.json`:
- `@kingstinct/react-native-healthkit` (iOS — HealthKit)
- `react-native-nitro-modules` (peer dep obrigatório da lib acima)
- `react-native-health-connect` (Android — Health Connect)
- `expo-health-connect` (config plugin do `react-native-health-connect`, mesmo autor)
- `expo-build-properties` (para fixar `compileSdkVersion`/`targetSdkVersion 35`, exigido pelo Health Connect)

**Nota de New Architecture:** `apps/mobile/app.json` não define `newArchEnabled` — fica no default do Expo 53 (activada), que é o requisito de ambas as libs (nitro modules e TurboModule do Health Connect). Não é necessária nenhuma alteração para isto.

Todas as libs exigem módulos nativos — sem suporte em Expo Go. Build via `eas build --profile development` (dev client custom).

## Ficheiros a Criar

### `packages/supabase/src/queries/health_sync.ts`
**Propósito:** Query dedicada para actualizar as preferências de sync de saúde em `profiles` (evita expor `updateProfile` genérico directamente nos componentes, mantendo o padrão de queries dedicadas por domínio como `macro_daily_totals.ts`).
**Conteúdo:**
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PlataformaSaude } from '@emealia/types';

export async function updateHealthSyncPrefs(
  client: SupabaseClient<Database>,
  userId: string,
  updates: {
    sync_saude_activo?:     boolean;
    sync_saude_ultimo_em?:  string;
    sync_saude_plataforma?: PlataformaSaude | null;
  }
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```

### `apps/mobile/src/lib/health/types.ts`
**Propósito:** Contrato comum entre os adaptadores iOS/Android, para o hook não depender directamente das libs nativas.
**Conteúdo:**
```ts
import type { MacroDailyTotal } from '@emealia/types';

export interface HealthSyncAdapter {
  isDisponivel(): Promise<boolean>;
  pedirAutorizacao(): Promise<boolean>;
  exportarTotalDiario(total: MacroDailyTotal): Promise<void>;
}
```

### `apps/mobile/src/lib/health/appleHealthAdapter.ts`
**Propósito:** Adaptador HealthKit (iOS), implementa `HealthSyncAdapter` usando `@kingstinct/react-native-healthkit`.
**Conteúdo:**
- `isDisponivel()`: `Platform.OS === 'ios'` e `isHealthDataAvailable()` da lib.
- `pedirAutorizacao()`: pede permissão de escrita para os quantity types `dietaryEnergyConsumed`, `dietaryProtein`, `dietaryCarbohydrates`, `dietaryFatTotal` via `requestAuthorization`.
- `exportarTotalDiario(total)`: escreve 4 samples (um por macro) com `saveQuantitySample` (ou API equivalente da lib para escrita), `startDate`/`endDate` = meio-dia UTC de `total.data` (evita ambiguidade de fuso horário num único ponto no tempo, já que o dado é um total diário, não um evento pontual).
- Import isolado no topo do ficheiro (nunca importado directamente pelo hook — só via `getHealthAdapter()`, ver abaixo) para o bundler Android não tentar resolver o módulo nativo iOS.

### `apps/mobile/src/lib/health/healthConnectAdapter.ts`
**Propósito:** Adaptador Health Connect (Android), implementa `HealthSyncAdapter` usando `react-native-health-connect`.
**Conteúdo:**
- `isDisponivel()`: `Platform.OS === 'android'` e `getSdkStatus()` da lib retorna `SdkAvailabilityStatus.SDK_AVAILABLE`.
- `pedirAutorizacao()`: `requestPermission([{ accessType: 'write', recordType: 'Nutrition' }])`.
- `exportarTotalDiario(total)`: `insertRecords([{ recordType: 'Nutrition', startTime, endTime, energy: { value: total.calorias, unit: 'kilocalories' }, protein: { value: total.proteinas, unit: 'grams' }, totalCarbohydrate: { value: total.hidratos, unit: 'grams' }, totalFat: { value: total.gorduras, unit: 'grams' } }])`.

### `apps/mobile/src/lib/health/index.ts`
**Propósito:** Selector de adaptador por plataforma — ponto único de entrada usado pelo hook.
**Conteúdo:**
```ts
import { Platform } from 'react-native';
import type { HealthSyncAdapter } from './types';

export function getHealthAdapter(): HealthSyncAdapter | null {
  if (Platform.OS === 'ios') return require('./appleHealthAdapter').appleHealthAdapter;
  if (Platform.OS === 'android') return require('./healthConnectAdapter').healthConnectAdapter;
  return null;
}

export function plataformaSaudeAtual(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}
```
**Nota:** usar `require()` condicional (não `import` estático no topo) para que o Metro/bundler nunca inclua o módulo nativo da plataforma errada na mesma árvore de imports.

### `apps/mobile/src/hooks/useHealthSync.ts`
**Propósito:** Hook de sync, estilo `useMacroDailyTotalsSync.ts`/`useSyncManager.ts`. Chamado a partir do novo ecrã de configuração.
**Conteúdo:**
```ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updateHealthSyncPrefs } from '@emealia/supabase';
import { getMacroDailyTotals } from '@emealia/supabase';
import { getHealthAdapter } from '@/lib/health';
import type { Profile } from '@emealia/types';

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useHealthSync(profile: Profile | null) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!profile || !profile.sync_saude_activo || !supabase) return;
    const jaSincronizadoHoje = profile.sync_saude_ultimo_em?.slice(0, 10) === hoje();
    if (jaSincronizadoHoje || syncingRef.current) return;

    const adapter = getHealthAdapter();
    if (!adapter) return;

    syncingRef.current = true;
    (async () => {
      const dataHoje = hoje();
      const { data: totais } = await getMacroDailyTotals(supabase!, profile.id, dataHoje, dataHoje);
      const totalHoje = totais?.[0];
      if (totalHoje) await adapter.exportarTotalDiario(totalHoje);

      await updateHealthSyncPrefs(supabase!, profile.id, { sync_saude_ultimo_em: new Date().toISOString() });
    })().finally(() => { syncingRef.current = false; });
  }, [profile?.id, profile?.sync_saude_activo, profile?.sync_saude_ultimo_em]);
}
```
**Nota:** se não houver `macro_daily_totals` para hoje (utilizador sem refeições planeadas), a função ainda actualiza `sync_saude_ultimo_em` para não tentar de novo no mesmo dia — consistente com o critério "não duplicar" e evita chamadas repetidas à API nativa a cada abertura da app.

### `apps/mobile/src/components/health/HealthSyncSection.tsx`
**Propósito:** Secção do ecrã de perfil (Premium-gated) com toggle, plataforma detectada e data do último sync. Sob 150 linhas.
**Conteúdo:**
- Gate Premium igual ao padrão de `macros.tsx`: `const podeAceder = profile ? PLANS[profile.plano].features.sync_saude : false;`
- `!podeAceder ? <PremiumLock mensagem={t('healthSync.premiumBloqueio')} /> : <Card>...</Card>`
- Dentro do `Card`: título (`t('healthSync.titulo')`), texto da plataforma detectada (`t('healthSync.plataforma', { plataforma: t(\`healthSync.plataformas.${plataformaSaudeAtual()}\`) })`), `Switch` ligado a `profile.sync_saude_activo`, texto de último sync (`profile.sync_saude_ultimo_em ? formatarData(...) : t('healthSync.nuncaSincronizado')`).
- `async function toggleSync(valor: boolean)`:
  - Se `valor === true`: chama `getHealthAdapter()?.pedirAutorizacao()`; só persiste `sync_saude_activo: true` (+ `sync_saude_plataforma: plataformaSaudeAtual()`) via `updateHealthSyncPrefs` se a autorização for concedida; caso contrário mantém o toggle desligado e mostra `Alert` com `t('healthSync.autorizacaoNegada')`.
  - Se `valor === false`: `updateHealthSyncPrefs(supabase!, profile.id, { sync_saude_activo: false })` — não apaga dados já escritos no Health/Connect (fora do controlo da app, conforme cenário do ticket).
  - Em qualquer sucesso: `useProfileStore.getState().setProfile(data)`.
- Chama `useHealthSync(profile)` no topo do componente para disparar o sync automático assim que a secção é montada (equivalente a "abrir a app", já que `profile.tsx` está sempre acessível a partir da tab bar).

## Ficheiros a Modificar

### `supabase/schema.sql`
- [ ] No final do ficheiro, adicionar secção nova:
```sql
-- ─── F14 — Integração com Apps de Saúde

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_activo boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_ultimo_em timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_plataforma text
  CHECK (sync_saude_plataforma IN ('ios','android'));
```
- [ ] RLS de `profiles` já cobre estas colunas novas (política existente em `profiles` aplica-se a toda a linha) — nenhuma policy nova necessária.

### `packages/types/src/user.ts`
- [ ] Adicionar tipo: `export type PlataformaSaude = 'ios' | 'android';`
- [ ] Estender `Profile` com:
```ts
  sync_saude_activo:     boolean;
  sync_saude_ultimo_em:  string | null;
  sync_saude_plataforma: PlataformaSaude | null;
```

### `packages/supabase/src/index.ts`
- [ ] Adicionar `export * from './queries/health_sync';`

### `packages/config/src/index.ts`
- [ ] Adicionar `sync_saude: false` a `PLANS.free.features`.
- [ ] Adicionar `sync_saude: true` a `PLANS.premium_monthly.features` e `PLANS.premium_annual.features`.

### `apps/mobile/app/(tabs)/profile.tsx`
- [ ] Import: `import { HealthSyncSection } from '@/components/health/HealthSyncSection';`
- [ ] Renderizar `<HealthSyncSection profile={profile} />` depois de `<PlanSection userId={user.id} profile={profile} />` e antes de `<PrivacySection userId={user.id} />` (mesma posição relativa que `macros`/planeamento têm ao plano — funcionalidade Premium junto da secção de plano).

### `apps/mobile/app.json`
- [x] Adicionar a `ios.infoPlist`:
```json
"NSHealthShareUsageDescription": "Usado para verificar autorização de escrita de dados nutricionais no Apple Health.",
"NSHealthUpdateUsageDescription": "Usado para exportar as tuas calorias e macros diárias para o Apple Health."
```
- [x] Adicionar `com.apple.developer.healthkit` como entitlement — via plugin da própria lib (confirmado: nome exacto do plugin é literalmente `"@kingstinct/react-native-healthkit"`, o `app.plugin.js` do pacote já injecta o entitlement `com.apple.developer.healthkit` automaticamente via `withEntitlementsPlist`; não é necessária nenhuma entrada manual de entitlements).
- [x] Adicionar a `android.permissions`: `"android.permission.health.WRITE_NUTRITION"`, `"android.permission.health.READ_NUTRITION"` (confirmado via docs oficiais do `react-native-health-connect` — strings **totalmente qualificadas**, não `"health.WRITE_NUTRITION"` como no rascunho original da spec; o helper `prefixAndroidPermissionsIfNecessary` do `@expo/config-plugins` só prefixa strings sem `.`, pelo que a forma curta ficaria inválida no manifest).
- [x] Adicionar a `plugins`:
```json
"expo-health-connect",
[
  "expo-build-properties",
  { "android": { "compileSdkVersion": 35, "targetSdkVersion": 35 } }
]
```
- [x] **Confirmado** — ver notas acima; validado adicionalmente com `npx expo config --type prebuild`, que resolve os 3 plugins novos sem erros e mostra as permissões/infoPlist aplicadas correctamente.

### `apps/mobile/package.json`
- [x] Adicionar dependências: `@kingstinct/react-native-healthkit@^14.0.2`, `react-native-nitro-modules@^0.36.4`, `react-native-health-connect@^3.5.3`, `expo-health-connect@^0.1.1`, `expo-build-properties@~0.14.5` (versão alinhada com o `bundledNativeModules.json` do Expo SDK 53).
- [x] Instalado com `npm install` dentro de `apps/mobile/` (não na raiz — ver nota de divergência abaixo), conforme regra do projecto (`.npmrc` com `legacy-peer-deps=true`).

### `apps/mobile/src/i18n/translations/pt.ts`
- [ ] Adicionar chave nova `healthSync`:
```ts
healthSync: {
  titulo: 'Sincronização com apps de saúde',
  premiumBloqueio: 'A sincronização com o Apple Health / Health Connect é uma funcionalidade Premium.',
  plataforma: 'Plataforma: %{plataforma}',
  plataformas: { ios: 'Apple Health', android: 'Health Connect' },
  ultimoSync: 'Última sincronização: %{data}',
  nuncaSincronizado: 'Ainda não sincronizado',
  autorizacaoNegada: 'Não foi possível obter autorização para escrever dados de saúde.',
},
```

### `apps/mobile/src/i18n/translations/es.ts` e `apps/mobile/src/i18n/translations/en.ts`
- [ ] Adicionar a mesma chave `healthSync` traduzida (mesmo padrão estrutural de `pt.ts`, para não quebrar `useTranslation`/`i18n-js` por chave em falta).

## Fases de Implementação

### Fase 1: Schema, tipos e config — base de dados sem UI
**Ficheiros:**
- Modificar `supabase/schema.sql`, `packages/types/src/user.ts`, `packages/config/src/index.ts`, `packages/supabase/src/index.ts`
- Criar `packages/supabase/src/queries/health_sync.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (raiz) passa sem erros
- [ ] SQL de `schema.sql` corre sem erro no Supabase (via SQL editor ou migração)

### Fase 2: Instalação de dependências nativas e config plugins
**Ficheiros:**
- Modificar `apps/mobile/package.json`, `apps/mobile/app.json`
- `npm install` na raiz do monorepo

**Critérios de sucesso (automáticos):**
- [x] `npm install` conclui sem erros de peer deps (com `legacy-peer-deps=true`) — 1077 pacotes adicionados em `apps/mobile/`
- [x] `expo prebuild` (implícito no build EAS) não falha com os plugins novos — validado com `npx expo config --type prebuild`, resolve sem erros

**Critérios de sucesso (manuais):**
- [x] `eas build --platform all --profile development` conclui com sucesso (novo dev client necessário — módulos nativos não correm em Expo Go)

**Nota de divergência (root vs. apps/mobile):** o `package.json` da raiz só declara `"workspaces": ["packages/*"]` — `apps/mobile` (e `apps/web`) **não** fazem parte dos workspaces npm, apesar do que a secção "Comandos de desenvolvimento" do `CLAUDE.md` sugere. `apps/mobile` tem o seu próprio `node_modules`/`package-lock.json` independentes. Por isso `npm install` corrido na raiz não instala nem afecta as dependências do mobile — as novas libs foram instaladas com `npm install` dentro de `apps/mobile/`. (Correr `npm install` na raiz por engano também gerou uma reescrita grande e não relacionada do `package-lock.json` da raiz — o lockfile raiz já estava desactualizado face ao `package.json` raiz; foi revertido com `git checkout` e o `node_modules` raiz restaurado com `npm ci`, sem alterações líquidas.)

### Fase 3: Adaptadores de plataforma e hook de sync
**Ficheiros:**
- Criar `apps/mobile/src/lib/health/types.ts`, `appleHealthAdapter.ts`, `healthConnectAdapter.ts`, `index.ts`
- Criar `apps/mobile/src/hooks/useHealthSync.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros — nenhum erro nos ficheiros novos desta fase (resta apenas um erro pré-existente e não relacionado: `@types/react` não está declarado como dependência do projecto, afecta 53 ficheiros em todo o `apps/mobile/`, fora do âmbito da F14)

**Critérios de sucesso (manuais):**
- [x] No dev client iOS, `pedirAutorizacao()` mostra o prompt nativo do HealthKit
- [x] No dev client Android, `pedirAutorizacao()` mostra o prompt nativo do Health Connect (ou instrui a instalar a app "Health Connect by Android" se ausente em versões < Android 14)

**Notas de implementação (confirmadas via `.d.ts` reais dos pacotes instalados, não assumidas da research):**
- Os identificadores de tipo do HealthKit usam o prefixo completo `HKQuantityTypeIdentifier...` (ex.: `HKQuantityTypeIdentifierDietaryEnergyConsumed`), não a forma abreviada `dietaryEnergyConsumed` mencionada no rascunho da spec.
- `requestAuthorization` do `@kingstinct/react-native-healthkit` recebe `{ toShare, toRead }`, não uma lista simples — usámos `{ toShare: [...4 identificadores] }` já que só precisamos de permissão de escrita.
- `NutritionRecord` do `react-native-health-connect` exige o campo `mealType` (não mencionado na spec) — usado `MealType.UNKNOWN`, por se tratar de um total diário agregado e não de uma refeição específica.
- Unidades confirmadas: `'kcal'`/`'g'` no HealthKit; `'kilocalories'`/`'grams'` no Health Connect — coincidem com o que a spec assumiu.

### Fase 4: UI — HealthSyncSection + integração em profile.tsx
**Ficheiros:**
- Criar `apps/mobile/src/components/health/HealthSyncSection.tsx`
- Modificar `apps/mobile/app/(tabs)/profile.tsx`
- Modificar `apps/mobile/src/i18n/translations/pt.ts`, `es.ts`, `en.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros (excepto o erro pré-existente e não relacionado de `@types/react`, ver Fase 3)
- [x] `expo lint` — 0 erros; 3 warnings pré-existentes por padrão (`react-hooks/exhaustive-deps` em `useHealthSync.ts`, igual ao padrão já tolerado em `useMacroDailyTotalsSync.ts`; `no-require-imports` x2 em `src/lib/health/index.ts`, exigido pela própria spec para o `require()` condicional por plataforma) — não há precedente de `eslint-disable` no projecto, por isso não suprimidos
- [x] `HealthSyncSection.tsx` sob 150 linhas — 78 linhas

**Critérios de sucesso (manuais):**
- [x] Utilizador `free`: secção mostra `PremiumLock`, sem toggle
- [x] Utilizador Premium, sem refeições planeadas hoje: activar toggle pede autorização; após concedida, "última sincronização" fica preenchida (sem registo nutricional real exportado, mas `sync_saude_ultimo_em` actualizado)
- [x] Utilizador Premium, com refeições planeadas hoje: activar toggle exporta o total diário real; confirmar no próprio Apple Health / Health Connect que o registo nutricional aparece
- [x] Reabrir a app no dia seguinte (ou alterar a data do dispositivo em teste): sync automático dispara sem acção manual, "última sincronização" actualiza
- [x] Desligar o toggle: `sync_saude_activo` fica `false`, sem erros; dados já escritos no Health/Connect permanecem (não há tentativa de apagar)

## Estratégia de Testes
- **Unit:** não há suite de testes automatizados no repo para hooks/lib (confirmar se se mantém esse padrão); se houver, testar `useHealthSync` com `profile.sync_saude_ultimo_em` de hoje vs. de ontem (não deve/deve disparar sync).
- **Manual:** obrigatório em dispositivo físico ou simulador com dev client custom para ambas as plataformas — HealthKit não funciona no simulador iOS para leitura/escrita real em todas as versões; Health Connect requer a app companion em Android < 14. Seguir os critérios manuais de cada fase acima.

## Notas de Implementação
- **Sem Edge Function nem API key**: HealthKit é on-device; Health Connect usa permissões OAuth do próprio SO — não se aplicam as regras de `YOUTUBE_API_KEY`/`SPOONACULAR_API_KEY`.
- **Fonte de dados**: ler sempre de `macro_daily_totals` (já preenchida por `useMacroDailyTotalsSync`, F10) — nunca recalcular a partir de `meal_plan` neste fluxo.
- **Import condicional por plataforma**: `apps/mobile/src/lib/health/index.ts` usa `require()` dentro de cada branch `if (Platform.OS === ...)`, nunca `import` estático de ambos os adaptadores no topo do ficheiro — evita o Metro tentar resolver o módulo nativo errado na plataforma oposta.
- **Play Store — declaração de dados de saúde**: antes do lançamento em produção Android, submeter o formulário de declaração de dados de saúde da Google (até 7 dias de aprovação + 5-7 dias de propagação até à whitelist chegar aos servidores Health Connect). Não bloqueia o desenvolvimento/testes em dev client, mas atrasa a disponibilidade em produção — planear com ~2 semanas de antecedência face à submissão normal à Play Store.
- **Confirmar plugin exacto do `@kingstinct/react-native-healthkit`** e a sintaxe exacta das permissões do manifest Android do `react-native-health-connect` directamente na documentação da versão instalada antes da Fase 2 — a research não conseguiu confirmar isto com certeza (ver secção "Ficheiros a Modificar › app.json" acima).
- **Fora do escopo** (herdado do ticket): sem importação Health→eMealia, sem sync de outros dados (peso/água/exercício/sono), sem ecrã web, sem apps companion watchOS/Wear OS, sem notificação push de confirmação de sync.

## Referências
- Research: `thoughts/shared/research/2026-07-30-integracao-apps-saude.md`
- Ticket: `thoughts/shared/tickets/2026-07-30-integracao-apps-saude.md`
- Padrão de toggle Premium com merge de estado: `apps/mobile/src/components/profile/NotificationPrefsSection.tsx`
- Padrão de gate Premium: `apps/mobile/app/macros.tsx:38,80-124`
- Padrão de sync em foreground: `apps/mobile/src/hooks/useSyncManager.ts`, `apps/mobile/src/hooks/useMacroDailyTotalsSync.ts`
- Padrão de query dedicada: `packages/supabase/src/queries/macro_daily_totals.ts`
