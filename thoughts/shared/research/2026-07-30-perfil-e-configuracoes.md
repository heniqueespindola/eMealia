---
data: 2026-07-30
feature: "Perfil e Configurações"
status: completo
---

# Research: Perfil e Configurações

## Questão de Pesquisa
Como implementar o ecrã completo de Perfil e Configurações (F13): edição de foto/nome, filtros dietéticos editáveis, idioma da app (PT/ES), notificações push por tipo, gestão de plano (RevenueCat), exportação de dados pessoais (GDPR Art. 20), eliminação de conta (GDPR Art. 17) e logout — tudo sincronizado em tempo real com a tabela `profiles` do Supabase. Ver ticket `thoughts/shared/tickets/2026-07-30-perfil-e-configuracoes.md`.

## Sumário
O ecrã `apps/mobile/app/(tabs)/profile.tsx` já existe e cobre **apenas** a secção de Plano (RevenueCat, upgrade/gerir subscrição, restaurar compras) — está pronta a reaproveitar sem alterações. Tudo o resto é greenfield: não existe upload de avatar/Storage bucket, não existe coluna `idioma` nem qualquer infraestrutura de i18n, não existe estrutura de preferências de notificação por tipo (só um `expo_push_token` único), e não existe nenhum fluxo de exportação ou eliminação de conta (GDPR). `updateProfile` (genérico, `Partial<Profile>`) já existe em `packages/supabase` e é o ponto de persistência natural para nome/filtros/idioma/preferências. A eliminação de conta exigirá uma nova Supabase Edge Function com `service_role`, seguindo o padrão já estabelecido nas 6 funções existentes. Nota: `FEATURES.md:323` marca F13 como "DONE", mas nenhuma parte desta feature está implementada no código — ver Questões em Aberto.

## Ficheiros Relevantes da Codebase

- `apps/mobile/app/(tabs)/profile.tsx` — ecrã actual; linhas 49-92 implementam a secção de Plano (RevenueCat) na íntegra, incluindo `useRevenueCat`, `PaywallModal`, `Purchases.showManageSubscriptions()`, data de renovação via `Purchases.getCustomerInfo()`. Reaproveitar tal-e-qual, apenas mover para dentro do ecrã reestruturado.
- `apps/mobile/src/hooks/useProfile.ts` — hook de leitura do perfil, evita refetch se já há perfil do mesmo `userId` em memória (comentário explica o porquê, ver linhas 17-25). Não tem método de update — updates são feitos directamente via `updateProfile` + `useProfileStore.getState().setProfile(...)`.
- `apps/mobile/src/stores/profileStore.ts` — store Zustand do perfil (`profile`, `loading`, `setProfile`, `setLoading`). Padrão de sync: após qualquer `updateProfile` bem-sucedido, chamar `useProfileStore.getState().setProfile(data)` manualmente (ver uso em `onboarding/step3.tsx:69`).
- `apps/mobile/src/hooks/useAuth.ts` — `signOut()` (linha 51-53) já existe (`await supabase.auth.signOut()`) mas **nunca é invocado em lado nenhum do código actual** — não há botão de logout em nenhum ecrã.
- `packages/supabase/src/queries/profile.ts` — `getProfile` e `updateProfile` (genérico, `Partial<Profile>`) já existem e cobrem todos os campos previstos (nome, avatar_url, filtros_dieteticos). Usado hoje em `onboarding/step3.tsx`, `useMacroGoals.ts`, `usePushNotifications.ts`, `useRevenueCat.ts`.
- `apps/mobile/src/hooks/usePushNotifications.ts` — `registerForPush(userId)`: pede permissão, obtém `Expo push token`, grava-o via `updateProfile(supabase!, userId, { expo_push_token: token })`. Não tem qualquer conceito de tipo/categoria de notificação.
- `apps/mobile/app/onboarding/step3.tsx` — padrão de multi-select de filtros dietéticos a reutilizar (ver secção "Padrões de Implementação Existentes").
- `apps/mobile/src/components/ui/{Button,Card,Input,Pill}.tsx` — primitivas reutilizáveis: `Pill` para multi-select de filtros, `Input` para o campo de nome, `Button`/`Card` para layout geral. Não existe `Switch`/`Toggle` nem `Modal` de confirmação pequeno — ambos terão de ser construídos de raiz.
- `supabase/functions/*/index.ts` (6 funções existentes) — padrão de Edge Function a seguir para `delete-account` (ver secção de Edge Functions abaixo).
- `supabase/schema.sql` — schema completo, RLS e cascade chain (linhas 9-241) relevantes para a eliminação de conta e exportação de dados.

## Padrões de Implementação Existentes

**Multi-select de filtros dietéticos** (`apps/mobile/app/onboarding/step3.tsx`), usando o componente `Pill`:
```tsx
const [filtrosFavoritosSelecionados, setFiltrosFavoritosSelecionados] = useState<FiltroDietetico[]>(filtrosFavoritos);

function toggleFiltro(value: FiltroDietetico) {
  setFiltrosFavoritosSelecionados((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
}
```
```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  {OPCOES_FILTROS_FAVORITOS.map((f) => (
    <Pill key={f.value} label={f.label} selected={filtrosFavoritosSelecionados.includes(f.value)}
          onPress={() => toggleFiltro(f.value)} />
  ))}
</View>
```
Para o ecrã de perfil, usar a lista completa `FILTROS_DIETETICOS` (`packages/config/src/index.ts:71-81`, 9 valores) em vez do subconjunto `OPCOES_FILTROS_FAVORITOS`, e semear o estado inicial a partir de `profile.filtros_dieteticos` em vez da `useOnboardingStore`.

**Persistência de update de perfil** (padrão repetido em `onboarding/step3.tsx`, `useMacroGoals.ts`, `usePushNotifications.ts`, `useRevenueCat.ts`):
```ts
const { data, error } = await updateProfile(supabase!, user.id, { filtros_dieteticos: novosFiltros });
if (data) useProfileStore.getState().setProfile(data);
```

**Confirmação destrutiva** (padrão idêntico em `PantryItemCard.tsx:18`, `ShoppingListModal.tsx:48`, `PlannerSlotCard.tsx:18`, `favoritos.tsx:47`):
```tsx
Alert.alert('Eliminar conta', 'Esta acção é irreversível e remove todos os teus dados. Continuar?', [
  { text: 'Cancelar', style: 'cancel' },
  { text: 'Eliminar', style: 'destructive', onPress: confirmarEliminarConta },
]);
```
Este é o único padrão de confirmação existente na app (não há modal customizado de confirmação pequena) — usar `Alert.alert` para logout e eliminar conta, consistente com o resto do código.

**Modal full-screen** (`PaywallModal.tsx`, `ShoppingListModal.tsx`) — se for necessário um ecrã modal (não aplicável a uma simples confirmação), o padrão é `Modal` nativo com `animationType="slide"`, header com título + botão "Fechar", corpo scrollável. Não recomendado para confirmação de eliminação de conta — `Alert.alert` é mais consistente com o resto da app.

**Invocação de Edge Function a partir do cliente** (`useRecipeSearch.ts:30`, `useShoppingList.ts:75`, etc.):
```ts
const { data, error } = await supabase.functions.invoke('nome-da-funcao', { body: { chave: valor } });
```
O SDK anexa automaticamente `Authorization`/`apikey`; nenhum hook faz gestão manual de headers.

**Estrutura de uma Edge Function** (ex: `notify-new-video/index.ts:1-8`):
```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  // ... usa supabaseAdmin, responde com Response(JSON.stringify(...), { status, headers })
});
```
Nota: o nome da env var de service role usado em todo o projecto é `SERVICE_ROLE_KEY_SUPABASE` (não o nome por omissão do Supabase). Nenhuma função existente verifica manualmente o JWT do chamador (dependem da verificação automática da gateway) nem faz um cliente "scoped" ao utilizador — todas operam com privilégios totais de `service_role`. Uma função `delete-account` precisará de extrair o `user_id` do JWT do chamador (via `supabaseAdmin.auth.getUser(token)` a partir do header `Authorization`) antes de chamar `auth.admin.deleteUser(id)`, para garantir que um utilizador só pode eliminar a própria conta — isto será a **primeira** função do projecto a precisar de identificar o utilizador chamador, não apenas confiar em parâmetros do body.

## Tabelas/Queries Supabase Relevantes

**Cascade chain confirmada** — todas as tabelas de dados do utilizador referenciam `profiles(id) ON DELETE CASCADE`, e `profiles.id` referencia `auth.users ON DELETE CASCADE`:
```sql
-- schema.sql:10
id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,   -- profiles.id

-- pantry_items:49, saved_recipes:74, meal_plan:101, shopping_list:130,
-- macro_daily_totals:179, followed_creators:228
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
```
**Eliminar o utilizador em `auth.users` (via `supabaseAdmin.auth.admin.deleteUser(id)`) cascata automaticamente por todas as tabelas** — não é preciso apagar manualmente cada tabela. `video_cache` e `creators` são partilhados, sem RLS e sem `user_id` — não entram na eliminação/exportação.

**RLS** — todas as tabelas de utilizador seguem o mesmo padrão de uma linha:
```sql
CREATE POLICY "profiles: só o próprio" ON profiles FOR ALL USING (auth.uid() = id);
-- pantry_items, saved_recipes, meal_plan, shopping_list, macro_daily_totals, followed_creators:
-- FOR ALL USING (auth.uid() = user_id)
```

**Queries de leitura existentes por tabela** (todas em `packages/supabase/src/queries/`), úteis para compor a exportação GDPR (não existe agregador multi-tabela — seria preciso compor chamadas):
```ts
getPantry(client, userId)         // pantry_items, ordenado por created_at desc
getSavedRecipes(client, userId, colecao?)  // saved_recipes
getShoppingList(client, userId)   // shopping_list
getMealPlanSemana(client, userId, semanaInicio)  // ⚠️ exige semana específica, não devolve tudo
```
`getMealPlanSemana` não serve directamente para exportação total — precisaria de uma nova query sem filtro de semana, ou de iterar todas as semanas existentes.

**`updateProfile` (já existente, genérico)**:
```ts
// packages/supabase/src/queries/profile.ts
export async function updateProfile(client, userId, updates: Partial<Profile>) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```
Aceita qualquer subconjunto de `Profile` sem alterações — mas `Profile` (packages/types/src/user.ts) **não tem** `idioma` nem estrutura de preferências de notificação; ambos exigem nova coluna + novo campo no tipo.

## APIs Externas Relevantes

- **Supabase Storage** — sem bucket configurado (grep por `storage`/`bucket` em `schema.sql` não devolveu nada). Será necessário criar um bucket (ex: `avatars`) com política RLS de upload/leitura restrita ao próprio utilizador, e decidir a convenção de path (ex: `avatars/{user_id}.jpg`).
- **Supabase Auth Admin API** — `auth.admin.deleteUser(id)` requer `service_role` key, só pode correr numa Edge Function (nunca no cliente, regra 6 do `CLAUDE.md`).
- **RevenueCat** (`react-native-purchases`) — já integrado (`Purchases.getCustomerInfo()`, `Purchases.showManageSubscriptions()`), reaproveitar sem alterações.
- **Expo Push Notifications** — token único já gerido via `usePushNotifications.ts`; preferências por tipo exigirão nova estrutura de dados (não há endpoint externo adicional, é apenas metadata local/Supabase que controla se o envio a partir de futuras Edge Functions deve ou não disparar).

## Code Snippets de Referência

**`Profile` type actual** (`packages/types/src/user.ts`, completo):
```ts
export interface Profile {
  id: string; nome: string | null; email: string; avatar_url: string | null;
  filtros_dieteticos: FiltroDietetico[]; plano: Plano; revenuecat_id: string | null;
  gdpr_consent: boolean; gdpr_consent_at: string | null; frequencia_cozinha: number | null;
  onboarding_completo: boolean; created_at: string;
  peso_kg: number | null; altura_cm: number | null; idade: number | null;
  sexo: Sexo | null; nivel_actividade: NivelActividade | null;
  objectivo_nutricional: ObjectivoNutricional | null;
  meta_calorias: number | null; meta_proteinas: number | null;
  meta_hidratos: number | null; meta_gorduras: number | null;
  expo_push_token: string | null;
}
```
Sem `idioma`, sem `updated_at`, sem preferências de notificação estruturadas.

**`FILTROS_DIETETICOS`** (`packages/config/src/index.ts:71-81`):
```ts
export const FILTROS_DIETETICOS = [
  { value: 'vegan', label: 'Vegan' }, { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'sem_gluten', label: 'Sem Glúten' }, { value: 'sem_lactose', label: 'Sem Lactose' },
  { value: 'airfryer', label: 'Airfryer' }, { value: 'rapida', label: 'Rápida (< 30min)' },
  { value: 'fria', label: 'Sem cozedura' }, { value: 'sobremesa', label: 'Sobremesa' },
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
] as const;
```

**Theme tokens** (`apps/mobile/src/constants/theme.ts`, completo) — sem cor "destructive/danger" dedicada; `colors.primaryDark` (`#A35139`) é o token de facto usado para erro/destrutivo em toda a app (ex: borda de erro em `Input.tsx`).

**Outbox/offline sync** (`packages/supabase/src/offline/`) — `OutboxEntity` está tipado como literal único `'pantry_items'` (`packages/types/src/offline.ts`), e `processOutbox` só tem um branch para essa entidade. **Não é reutilizável tal-e-qual** para sincronizar updates de perfil offline sem extensão do tipo e de `processOutbox`; além disso `resolveConflict` (last-write-wins) depende de um campo `updated_at` que `Profile` não tem.

## Questões em Aberto

1. **Discrepância em `FEATURES.md`** — a linha 323 marca "F13 — Perfil e configurações" como `DONE`, mas nenhuma parte desta feature (avatar, filtros editáveis, idioma, notificações por tipo, GDPR export/delete, logout) existe no código actual. Confirmar com o utilizador se isto é um erro de tracking a corrigir, ou se "DONE" só se refere ao ticket/prompt ter sido escrito em `FEATURES.md` (não à implementação).
2. **Bucket de Supabase Storage para avatars** — precisa de ser criado manualmente no Dashboard (nome, política RLS, limite de tamanho/tipo de ficheiro) antes ou durante a implementação; não há infraestrutura-como-código para buckets neste repo (schema.sql não cobre `storage.*`).
3. **Estrutura de preferências de notificação** — `jsonb` (ex: `notificacoes_prefs: {"sugestoes_jantar": true, "alertas_despensa": true}`) vs. colunas booleanas separadas. Como não existe ainda nenhum emissor real de notificações "sugestões de jantar" ou "alertas de despensa" (só o toggle é pedido nesta feature — o envio real é F15, ainda por implementar), a estrutura escolhida deve antecipar o que F15 vai precisar de ler.
4. **Abordagem de i18n** — não existe nenhuma biblioteca nem dicionário de traduções no projecto. Introduzir `expo-localization` + `i18n-js`/`react-i18next` (mais robusto, mas requer extrair todas as strings PT existentes, incluindo as de `packages/config`) vs. uma solução mínima (dicionário simples `pt.ts`/`es.ts` + hook `useTranslation` custom) apenas para as strings novas desta feature, deixando o resto da app por traduzir nesta fase. Precisa de decisão antes do `/plan`.
5. **Reautenticação antes de eliminar conta** — o ticket marcou isto como fora de escopo "a confirmar em research"; não há padrão existente no projecto (nenhum fluxo de reautenticação implementado). Recomenda-se manter fora de escopo do MVP desta feature, mas foi deixado como pergunta explícita.
6. **Exportação de dados: cliente vs. Edge Function** — dado que RLS já restringe leitura aos dados do próprio utilizador, é tecnicamente possível agregar tudo (`profiles`, `pantry_items`, `saved_recipes`, `meal_plan` — todas as semanas, não só uma — `shopping_list`, `followed_creators`) directamente no cliente com o `anon` key + sessão do utilizador, sem precisar de Edge Function nem de `service_role`. Uma Edge Function só seria necessária para gerar um ficheiro/anexo formal ou para consolidar num único pedido; a decisão de arquitectura (cliente puro vs. Edge Function) fica para `/plan`.
7. **Mecanismo de "download" do export em React Native** — não há padrão existente de partilha/exportação de ficheiros (falta `expo-sharing` no `package.json` actual, a confirmar). Precisa de decisão em `/plan`: gerar JSON e usar `expo-sharing`/`Share.share()` nativo, ou outro mecanismo.
8. **`getMealPlanSemana` não serve para "todas as semanas"** — para a exportação GDPR completa do planeamento semanal, será preciso ou uma nova query `getMealPlanTodas(client, userId)` sem filtro de semana, ou aceitar que a exportação de `meal_plan` fica limitada/fora de escopo nesta fase (a decidir em `/plan`).
