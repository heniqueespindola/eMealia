---
data: 2026-07-28
feature: "Contagem de Macros Avançada (F10)"
research: "thoughts/shared/research/2026-07-28-macros-avancadas.md"
status: completo
---

# Spec: Contagem de Macros Avançada (F10)

## Visão Geral
Dashboard Premium (`app/macros.tsx`, acessível a partir de `profile.tsx`) com objectivos nutricionais diários calculados via Mifflin-St Jeor, progresso visual por macro face às refeições planeadas do dia, histórico semanal/mensal persistido em `macro_daily_totals`, e alerta de desvio calórico quando 4+ dos últimos 7 dias excedem o objectivo.

## Decisões tomadas (resultado das perguntas de clarificação)
1. **Armazenamento de objectivos** → estender `profiles` com novas colunas (não tabela dedicada).
2. **Histórico** → persistir totais diários numa nova tabela `macro_daily_totals`, sincronizada a partir do cliente sempre que `meal_plan` muda (sem trigger SQL, porque a resolução de macros depende de uma chamada assíncrona à Edge Function Spoonacular).
3. **Navegação** → secção/cartão em `profile.tsx` que navega para um ecrã próprio `app/macros.tsx` (fora dos tabs); o próprio ecrã faz o gate Premium, tal como `planner.tsx`.
4. **Gráfico de barras** → `View`s com `width: '${pct}%'`, sem nova dependência.

## ⚠️ Decisão adicional a validar antes de `/implement`
O ticket só menciona **peso, altura, nível de actividade, objectivo** como inputs, mas a fórmula Mifflin-St Jeor (referida como exemplo no ticket) exige também **idade** e **sexo biológico** para calcular a TMB correctamente. Sem estes dois campos não há fórmula nutricional correcta possível. Esta spec assume que se adicionam `idade` e `sexo` como campos extra no formulário de objectivos e em `profiles`. Se preferires uma fórmula simplificada que dispense estes dois campos (ex: kcal/kg de peso corporal por nível de actividade, sem idade/sexo), diz antes de avançar para `/implement` — a Fase 2 muda.

---

## Ficheiros a Criar

### `supabase/schema.sql` (secção nova, ao fim do ficheiro)
**Propósito:** nova tabela de histórico + colunas de objectivos em `profiles`.
**Conteúdo:**
```sql
-- ─── Perfis: objectivos nutricionais (F10)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS peso_kg numeric,
  ADD COLUMN IF NOT EXISTS altura_cm numeric,
  ADD COLUMN IF NOT EXISTS idade int,
  ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('masculino','feminino')),
  ADD COLUMN IF NOT EXISTS nivel_actividade text
    CHECK (nivel_actividade IN ('sedentario','ligeiro','moderado','intenso','muito_intenso')),
  ADD COLUMN IF NOT EXISTS objectivo_nutricional text
    CHECK (objectivo_nutricional IN ('perda','manutencao','ganho')),
  ADD COLUMN IF NOT EXISTS meta_calorias int,
  ADD COLUMN IF NOT EXISTS meta_proteinas int,
  ADD COLUMN IF NOT EXISTS meta_hidratos int,
  ADD COLUMN IF NOT EXISTS meta_gorduras int;

-- ─── Macro Daily Totals (F10 — histórico persistido)
CREATE TABLE IF NOT EXISTS macro_daily_totals (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data       date        NOT NULL,
  calorias   int         NOT NULL DEFAULT 0,
  proteinas  int         NOT NULL DEFAULT 0,
  hidratos   int         NOT NULL DEFAULT 0,
  gorduras   int         NOT NULL DEFAULT 0,
  parcial    boolean     NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, data)
);

ALTER TABLE macro_daily_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "macro_daily_totals: só o próprio" ON macro_daily_totals;
CREATE POLICY "macro_daily_totals: só o próprio"
  ON macro_daily_totals FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS macro_daily_totals_user_data_idx ON macro_daily_totals(user_id, data);
```
Executar manualmente no Supabase SQL editor (o projecto não usa ferramenta de migrations automática — `schema.sql` é a fonte da verdade, aplicado à mão).

### `packages/types/src/macros.ts`
**Propósito:** tipos partilhados para objectivos e histórico de macros.
**Conteúdo:**
```ts
export type NivelActividade = 'sedentario' | 'ligeiro' | 'moderado' | 'intenso' | 'muito_intenso';
export type ObjectivoNutricional = 'perda' | 'manutencao' | 'ganho';
export type Sexo = 'masculino' | 'feminino';

export interface MacroGoalsInput {
  peso_kg:               number;
  altura_cm:             number;
  idade:                 number;
  sexo:                  Sexo;
  nivel_actividade:      NivelActividade;
  objectivo_nutricional: ObjectivoNutricional;
}

export interface MacroTargets {
  meta_calorias:  number;
  meta_proteinas: number;
  meta_hidratos:  number;
  meta_gorduras:  number;
}

export interface MacroDailyTotal {
  id:         string;
  user_id:    string;
  data:       string;
  calorias:   number;
  proteinas:  number;
  hidratos:   number;
  gorduras:   number;
  parcial:    boolean;
  updated_at: string;
}
```

### `packages/config/src/macros.ts`
**Propósito:** constantes da fórmula Mifflin-St Jeor + função pura de cálculo de objectivos (lógica de negócio partilhável, sem dependências de UI).
**Conteúdo:**
```ts
import type { MacroGoalsInput, MacroTargets, NivelActividade, ObjectivoNutricional } from '@emealia/types';

export const ACTIVITY_FACTORS: Record<NivelActividade, number> = {
  sedentario:     1.2,
  ligeiro:        1.375,
  moderado:       1.55,
  intenso:        1.725,
  muito_intenso:  1.9,
};

export const OBJECTIVE_ADJUSTMENTS: Record<ObjectivoNutricional, number> = {
  perda:       0.8,
  manutencao:  1.0,
  ganho:       1.1,
};

export const NIVEIS_ACTIVIDADE: { value: NivelActividade; label: string }[] = [
  { value: 'sedentario',    label: 'Sedentário (pouco ou nenhum exercício)' },
  { value: 'ligeiro',       label: 'Ligeiro (exercício 1-3x/semana)' },
  { value: 'moderado',      label: 'Moderado (exercício 3-5x/semana)' },
  { value: 'intenso',       label: 'Intenso (exercício 6-7x/semana)' },
  { value: 'muito_intenso', label: 'Muito intenso (atleta, 2x/dia)' },
];

export const OBJECTIVOS_NUTRICIONAIS: { value: ObjectivoNutricional; label: string }[] = [
  { value: 'perda',      label: 'Perda de peso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'ganho',      label: 'Ganho de peso' },
];

const PROTEINA_G_POR_KG = 2;
const GORDURA_PERCENT_CALORIAS = 0.25;

export function calcularObjectivosDiarios(input: MacroGoalsInput): MacroTargets {
  const tmb = input.sexo === 'masculino'
    ? 10 * input.peso_kg + 6.25 * input.altura_cm - 5 * input.idade + 5
    : 10 * input.peso_kg + 6.25 * input.altura_cm - 5 * input.idade - 161;

  const tdee = tmb * ACTIVITY_FACTORS[input.nivel_actividade];
  const metaCalorias = Math.round(tdee * OBJECTIVE_ADJUSTMENTS[input.objectivo_nutricional]);

  const metaProteinas = Math.round(input.peso_kg * PROTEINA_G_POR_KG);
  const metaGorduras  = Math.round((metaCalorias * GORDURA_PERCENT_CALORIAS) / 9);
  const caloriasRestantes = Math.max(metaCalorias - metaProteinas * 4 - metaGorduras * 9, 0);
  const metaHidratos = Math.round(caloriasRestantes / 4);

  return {
    meta_calorias:  metaCalorias,
    meta_proteinas: metaProteinas,
    meta_hidratos:  metaHidratos,
    meta_gorduras:  metaGorduras,
  };
}
```

### `packages/supabase/src/queries/macro_daily_totals.ts`
**Propósito:** queries de leitura (intervalo de datas) e escrita (upsert em lote) de `macro_daily_totals`.
**Conteúdo:**
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

type MacroDailyTotalInsert = Database['public']['Tables']['macro_daily_totals']['Insert'];

export async function getMacroDailyTotals(
  client: SupabaseClient<Database>,
  userId: string,
  dataInicio: string,
  dataFim: string
) {
  return client
    .from('macro_daily_totals')
    .select('*')
    .eq('user_id', userId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true });
}

export async function upsertMacroDailyTotals(
  client: SupabaseClient<Database>,
  rows: MacroDailyTotalInsert[]
) {
  return client.from('macro_daily_totals').upsert(rows, { onConflict: 'user_id,data' }).select();
}
```

### `apps/mobile/src/lib/macroResolution.ts`
**Propósito:** extrair a lógica de resolução de macros por dia que hoje vive dentro de `usePlannerMacros.ts`, para ser reutilizada também pela sincronização de histórico (`useMacroDailyTotalsSync`), sem duplicar a chamada a `saved_recipes.macros` / Edge Function.
**Conteúdo:**
```ts
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export interface DiaMacros {
  totais:  MacroNutrients;
  parcial: boolean;
}

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

export async function resolverMacrosPorDia(
  items: MealPlanItem[],
  savedRecipes: SavedRecipe[],
  fetchMacros: (recipeId: string) => Promise<MacroNutrients | null>,
  cache: Map<string, MacroNutrients | null>
): Promise<Record<number, DiaMacros>> {
  const savedMap = new Map(savedRecipes.map((r) => [r.recipe_id, r.macros]));
  const porDia: Record<number, DiaMacros> = {};

  for (const item of items) {
    if (!item.recipe_id) continue;
    let macros: MacroNutrients | null = savedMap.get(item.recipe_id) ?? null;

    if (!macros && item.fonte === 'spoonacular') {
      if (cache.has(item.recipe_id)) {
        macros = cache.get(item.recipe_id)!;
      } else {
        macros = await fetchMacros(item.recipe_id);
        cache.set(item.recipe_id, macros);
      }
    }

    const atual = porDia[item.dia_semana] ?? { totais: { ...VAZIO }, parcial: false };
    if (macros) {
      atual.totais = {
        calorias:  atual.totais.calorias  + macros.calorias,
        proteinas: atual.totais.proteinas + macros.proteinas,
        hidratos:  atual.totais.hidratos  + macros.hidratos,
        gorduras:  atual.totais.gorduras  + macros.gorduras,
      };
    } else {
      atual.parcial = true;
    }
    porDia[item.dia_semana] = atual;
  }

  return porDia;
}
```

### `apps/mobile/src/hooks/useMacroGoals.ts`
**Propósito:** guardar objectivos nutricionais no perfil, calculando as metas via `calcularObjectivosDiarios`.
**Conteúdo:**
```ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@emealia/supabase';
import { calcularObjectivosDiarios } from '@emealia/config';
import { useProfileStore } from '@/stores/profileStore';
import type { MacroGoalsInput } from '@emealia/types';

export function useMacroGoals(userId: string | undefined) {
  const [saving, setSaving] = useState(false);

  async function guardarObjectivos(input: MacroGoalsInput) {
    if (!userId) return false;
    setSaving(true);
    const metas = calcularObjectivosDiarios(input);
    const { data, error } = await updateProfile(supabase!, userId, { ...input, ...metas });
    setSaving(false);
    if (error) { console.error('[useMacroGoals] updateProfile falhou:', error); return false; }
    if (data) useProfileStore.getState().setProfile(data);
    return true;
  }

  return { guardarObjectivos, saving };
}
```

### `apps/mobile/src/hooks/useMacroDailyTotalsSync.ts`
**Propósito:** sempre que os itens de `meal_plan` da semana em vista mudam (adicionar/mover/remover slot), recalcula os totais dos 7 dias e sincroniza com `macro_daily_totals`. Corre em segundo plano, sem bloquear a UI.
**Conteúdo:**
```ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertMacroDailyTotals } from '@emealia/supabase';
import { resolverMacrosPorDia } from '@/lib/macroResolution';
import { useRecipeMacros } from './useRecipeMacros';
import { dataDoSlot } from '@/constants/planner';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export function useMacroDailyTotalsSync(
  userId: string | undefined,
  semanaInicio: string,
  items: MealPlanItem[],
  savedRecipes: SavedRecipe[],
  enabled: boolean
) {
  const { fetchMacros } = useRecipeMacros();
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelado = false;

    async function sincronizar() {
      const porDia = await resolverMacrosPorDia(items, savedRecipes, fetchMacros, cacheRef.current);
      if (cancelado) return;

      const rows = Array.from({ length: 7 }, (_, dia) => {
        const dados = porDia[dia] ?? { totais: { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 }, parcial: false };
        return {
          user_id:  userId,
          data:     dataDoSlot(semanaInicio, dia),
          calorias: dados.totais.calorias,
          proteinas: dados.totais.proteinas,
          hidratos: dados.totais.hidratos,
          gorduras: dados.totais.gorduras,
          parcial:  dados.parcial,
        };
      });

      const { error } = await upsertMacroDailyTotals(supabase!, rows);
      if (error) console.error('[useMacroDailyTotalsSync] upsertMacroDailyTotals falhou:', error);
    }

    sincronizar();
    return () => { cancelado = true; };
  }, [userId, semanaInicio, items, savedRecipes, enabled]);
}
```
**Nota:** faz upsert dos 7 dias mesmo quando vazios (zerados), para que remover a última receita de um dia actualize correctamente o histórico em vez de deixar lá um total antigo.

### `apps/mobile/src/hooks/useMacroHistory.ts`
**Propósito:** ler `macro_daily_totals` agregados por semana ou mês, para a vista de histórico.
**Conteúdo:**
```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMacroDailyTotals } from '@emealia/supabase';
import { segundaFeiraDaSemana } from '@/constants/planner';
import type { MacroDailyTotal, MacroNutrients } from '@emealia/types';

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

function intervaloDoPeriodo(periodo: 'semana' | 'mes', dataReferencia: string) {
  const base = new Date(`${dataReferencia}T00:00:00`);
  if (periodo === 'semana') {
    const inicio = segundaFeiraDaSemana(base);
    const fimDate = new Date(`${inicio}T00:00:00`);
    fimDate.setDate(fimDate.getDate() + 6);
    return { inicio, fim: fimDate.toISOString().slice(0, 10) };
  }
  const inicioDate = new Date(base.getFullYear(), base.getMonth(), 1);
  const fimDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { inicio: inicioDate.toISOString().slice(0, 10), fim: fimDate.toISOString().slice(0, 10) };
}

export function useMacroHistory(userId: string | undefined, periodo: 'semana' | 'mes', dataReferencia: string) {
  const [dias, setDias] = useState<MacroDailyTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const { inicio, fim } = intervaloDoPeriodo(periodo, dataReferencia);
    getMacroDailyTotals(supabase!, userId, inicio, fim).then(({ data, error }) => {
      if (error) console.error('[useMacroHistory] getMacroDailyTotals falhou:', error);
      setDias(data ?? []);
      setLoading(false);
    });
  }, [userId, periodo, dataReferencia]);

  const media = dias.length
    ? dias.reduce<MacroNutrients>((acc, d) => ({
        calorias:  acc.calorias  + d.calorias  / dias.length,
        proteinas: acc.proteinas + d.proteinas / dias.length,
        hidratos:  acc.hidratos  + d.hidratos  / dias.length,
        gorduras:  acc.gorduras  + d.gorduras  / dias.length,
      }), { ...VAZIO })
    : VAZIO;

  return { dias, media, loading };
}
```

### `apps/mobile/src/hooks/useMacroDeviationAlert.ts`
**Propósito:** verificar, nos últimos 7 dias corridos, quantos excederam `meta_calorias`; expõe `alerta: boolean` quando ≥4.
**Conteúdo:**
```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMacroDailyTotals } from '@emealia/supabase';

export function useMacroDeviationAlert(userId: string | undefined, metaCalorias: number | null, enabled: boolean) {
  const [diasExcedidos, setDiasExcedidos] = useState(0);

  useEffect(() => {
    if (!userId || !enabled || !metaCalorias) { setDiasExcedidos(0); return; }

    const hoje = new Date();
    const fim = hoje.toISOString().slice(0, 10);
    const inicioDate = new Date(hoje);
    inicioDate.setDate(hoje.getDate() - 6);
    const inicio = inicioDate.toISOString().slice(0, 10);

    getMacroDailyTotals(supabase!, userId, inicio, fim).then(({ data, error }) => {
      if (error) { console.error('[useMacroDeviationAlert] falhou:', error); return; }
      setDiasExcedidos((data ?? []).filter((d) => d.calorias > metaCalorias).length);
    });
  }, [userId, metaCalorias, enabled]);

  return { alerta: diasExcedidos >= 4, diasExcedidos };
}
```
**Nota de interpretação:** o ticket diz "desvio calórico consistente ... em vários dias consecutivos (ex: 4+ dos 7 dias)". Implementa-se como contagem simples dentro da janela dos últimos 7 dias corridos (não exige que sejam consecutivos entre si), por ser a leitura mais directa de "4+ dos 7 dias" e a mais simples de implementar/testar.

### `apps/mobile/src/components/macros/MacroProgressBar.tsx`
**Propósito:** barra de progresso de uma única macro (`View` com largura percentual).
**Conteúdo:**
```tsx
import { View, Text } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { colors, fonts, radius, spacing } from '@/constants/theme';

interface MacroProgressBarProps {
  label:  string;
  atual:  number;
  meta:   number;
  unidade: string;
}

export function MacroProgressBar({ label, atual, meta, unidade }: MacroProgressBarProps) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const excedido = meta > 0 && atual > meta;

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
            {Math.round(atual)}/{meta} {unidade}
          </Text>
          {excedido && <Badge label="excedido" variant="alerta" />}
        </View>
      </View>
      <View style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.bgDarkAlt, overflow: 'hidden' }}>
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: excedido ? colors.primaryDark : colors.primary,
          }}
        />
      </View>
    </View>
  );
}
```

### `apps/mobile/src/components/macros/MacroProgressSection.tsx`
**Propósito:** agrupa as 4 `MacroProgressBar` (calorias, proteínas, hidratos, gorduras) para os totais do dia actual, dentro de um `Card`.
**Conteúdo:**
- Props: `{ totais: MacroNutrients; metas: MacroTargets; parcial: boolean }`
- Renderiza `Card` com título "Hoje", `Badge "parcial"` se `parcial`, e 4× `MacroProgressBar` (kcal, proteínas g, hidratos g, gorduras g)

### `apps/mobile/src/components/macros/MacroGoalsForm.tsx`
**Propósito:** formulário de definição/edição de objectivos nutricionais.
**Conteúdo:**
- Usa `Input` (peso_kg, altura_cm, idade — `keyboardType="numeric"`), selecção de `sexo` / `nivel_actividade` (via `NIVEIS_ACTIVIDADE` de `@emealia/config`) / `objectivo_nutricional` (via `OBJECTIVOS_NUTRICIONAIS`) com `Pill`s reutilizados de `@/components/ui/Pill` (já usados em `feedFilters`/onboarding para selecção única)
- Validação mínima: todos os campos preenchidos e numéricos > 0 antes de activar o botão "Guardar"
- Ao submeter, chama `guardarObjectivos` de `useMacroGoals`; mostra `ActivityIndicator` no botão enquanto `saving`
- Pré-preenche os campos a partir de `profile.peso_kg` etc quando já existirem (edição)

### `apps/mobile/src/components/macros/MacroHistoryView.tsx`
**Propósito:** vista de histórico com toggle semana/mês e navegação entre períodos.
**Conteúdo:**
- Props: `{ userId, dataReferencia, periodo, onPeriodoChange, onNavegarPeriodo, metas }`
- Toggle "Semana" / "Mês" com `Pill`
- Navegação anterior/seguinte reutilizando o padrão visual de `WeekNavigator.tsx` (setas + label do intervalo); para mês, novo label formatado localmente (`Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })`)
- Usa `useMacroHistory` internamente (ou recebe already-fetched `dias`/`media` via props — preferir receber como props para manter o componente puramente de apresentação, com o hook chamado no ecrã `macros.tsx`)
- Lista os dias (`FlatList` ou `.map`, período é sempre ≤31 dias) — cada linha mostra data formatada + `calorias` + indicador visual se excedeu `metas.meta_calorias`
- Bloco de resumo no topo com a média do período por macro (reutilizando `MacroProgressBar` com `atual = média`, `meta = metas.meta_X`)

### `apps/mobile/src/components/macros/MacroDeviationAlert.tsx`
**Propósito:** banner de alerta de desvio calórico.
**Conteúdo:**
```tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, fonts, spacing } from '@/constants/theme';

interface MacroDeviationAlertProps {
  diasExcedidos: number;
}

export function MacroDeviationAlert({ diasExcedidos }: MacroDeviationAlertProps) {
  return (
    <Card style={{ borderWidth: 1, borderColor: colors.primaryDark, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="alert-circle" size={20} color={colors.primaryDark} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>
          Excedeste o teu objectivo calórico em {diasExcedidos} dos últimos 7 dias.
        </Text>
      </View>
    </Card>
  );
}
```

### `apps/mobile/app/macros.tsx`
**Propósito:** ecrã principal do dashboard de macros — gate Premium, tabs internos "Hoje" / "Objectivos" / "Histórico".
**Conteúdo:**
- `podeAceder = profile ? PLANS[profile.plano].features.macros : false` — se `!podeAceder`, mostra `PremiumLock mensagem="A contagem avançada de macros é uma funcionalidade Premium. Faz upgrade para desbloquear."` (mesmo padrão de `planner.tsx`)
- Estado local `vista: 'hoje' | 'objectivos' | 'historico'`, alternado por `Pill`s no topo
- **Vista "hoje":** usa `usePlanner(user?.id, semanaInicio, podeAceder)` (só leitura dos `items`, ignora mutators), `useSavedRecipes(user?.id)`, `usePlannerMacros(items, favoritos)`, filtra `macrosByDia[diaSemanaAtual()]`; se `!profile.meta_calorias` mostra CTA "Define os teus objectivos primeiro" a apontar para a vista "objectivos"; senão renderiza `MacroProgressSection`
- **Vista "objectivos":** renderiza `MacroGoalsForm`
- **Vista "histórico":** usa `useMacroHistory` + renderiza `MacroHistoryView`
- No topo, sempre visível quando `alerta` é `true`: `useMacroDeviationAlert(user?.id, profile?.meta_calorias ?? null, podeAceder)` → `<MacroDeviationAlert diasExcedidos={diasExcedidos} />`

---

## Ficheiros a Modificar

### `packages/types/src/user.ts`
- [ ] Estender `Profile` com os novos campos (todos opcionais/`null` até o utilizador definir objectivos):
```ts
peso_kg:               number | null;
altura_cm:             number | null;
idade:                 number | null;
sexo:                  Sexo | null;
nivel_actividade:      NivelActividade | null;
objectivo_nutricional: ObjectivoNutricional | null;
meta_calorias:         number | null;
meta_proteinas:        number | null;
meta_hidratos:         number | null;
meta_gorduras:         number | null;
```
- [ ] Import `Sexo, NivelActividade, ObjectivoNutricional` de `./macros`

### `packages/types/src/database.ts`
- [ ] Import `MacroDailyTotal` de `./macros`
- [ ] Adicionar entrada `macro_daily_totals` em `Tables`:
```ts
macro_daily_totals: {
  Row:           Simplify<MacroDailyTotal>;
  Insert:        Simplify<Omit<MacroDailyTotal, 'id' | 'updated_at'>>;
  Update:        Simplify<Partial<MacroDailyTotal>>;
  Relationships: [];
};
```

### `packages/types/src/index.ts`
- [ ] Adicionar `export * from './macros';`

### `packages/config/src/index.ts`
- [ ] Adicionar `export * from './macros';`

### `packages/supabase/src/index.ts`
- [ ] Adicionar `export * from './queries/macro_daily_totals';`

### `apps/mobile/src/constants/planner.ts`
- [ ] Adicionar `dataDoSlot(semanaInicio: string, diaSemana: number): string` — converte `semana_inicio` + `dia_semana` (0-6) na data real (`YYYY-MM-DD`), somando `diaSemana` dias a `semanaInicio`
- [ ] Adicionar `diaSemanaAtual(base: Date = new Date()): number` — devolve o índice 0-6 (0=Segunda) do dia actual, usando a mesma convenção de `segundaFeiraDaSemana` (`getDay() === 0 ? 6 : getDay() - 1`)

### `apps/mobile/src/hooks/usePlannerMacros.ts`
- [ ] Refactor para delegar em `resolverMacrosPorDia` (de `@/lib/macroResolution`) em vez de reimplementar o loop — mantém a mesma assinatura pública (`{ macrosByDia }`), zero mudança de comportamento:
```ts
import { useEffect, useRef, useState } from 'react';
import { useRecipeMacros } from './useRecipeMacros';
import { resolverMacrosPorDia, type DiaMacros } from '@/lib/macroResolution';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export function usePlannerMacros(items: MealPlanItem[], savedRecipes: SavedRecipe[]) {
  const { fetchMacros } = useRecipeMacros();
  const [macrosByDia, setMacrosByDia] = useState<Record<number, DiaMacros>>({});
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    let cancelado = false;
    resolverMacrosPorDia(items, savedRecipes, fetchMacros, cacheRef.current).then((porDia) => {
      if (!cancelado) setMacrosByDia(porDia);
    });
    return () => { cancelado = true; };
  }, [items, savedRecipes]);

  return { macrosByDia };
}
```

### `apps/mobile/app/(tabs)/planner.tsx`
- [ ] Import `useMacroDailyTotalsSync` e `useSavedRecipes` já está importado como `favoritos`
- [ ] Adicionar, a par de `podeAceder` (linha 26): `const podeAcederMacros = profile ? PLANS[profile.plano].features.macros : false;`
- [ ] Depois da linha `const { macrosByDia } = usePlannerMacros(items, favoritos);`, adicionar:
```ts
useMacroDailyTotalsSync(user?.id, semanaInicio, items, favoritos, podeAcederMacros);
```
**Nota:** usa a flag `macros`, não `planeamento_semanal` — são features Premium distintas mesmo que hoje tenham o mesmo valor para todos os planos.

### `apps/mobile/app/(tabs)/profile.tsx`
- [ ] Import `router` já vem de `expo-router` (usado indirectamente por `PremiumLock`, mas aqui precisa de import directo) e `Ionicons` de `@expo/vector-icons`
- [ ] Adicionar novo `Card` (depois do `Card` "Plano actual", antes do botão "Restaurar compras"):
```tsx
<Card>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textInverted }}>
      Dashboard de Macros
    </Text>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </View>
  <View style={{ marginTop: spacing.sm }}>
    <Button label="Ver objectivos e progresso" variant="outline" onPress={() => router.push('/macros')} />
  </View>
</Card>
```
Visível para todos os planos — o gate Premium acontece dentro de `macros.tsx` (mesmo padrão de `planner.tsx`), não escondendo a entrada.

### `apps/mobile/app/(tabs)/index.tsx`
- [ ] Import `useMacroDeviationAlert` e `MacroDeviationAlert`, e `PLANS` de `@emealia/config`
- [ ] Adicionar `const podeAcederMacros = profile ? PLANS[profile.plano].features.macros : false;`
- [ ] Adicionar `const { alerta, diasExcedidos } = useMacroDeviationAlert(user?.id, profile?.meta_calorias ?? null, podeAcederMacros);`
- [ ] Renderizar `{alerta && <MacroDeviationAlert diasExcedidos={diasExcedidos} />}` logo abaixo do título "eMealia" (antes dos `Pill`s de filtro), com `paddingHorizontal: spacing.lg`

---

## Fases de Implementação

### Fase 1: Schema, tipos e queries — fundação de dados
**Ficheiros:**
- Criar bloco novo em `supabase/schema.sql`
- Criar `packages/types/src/macros.ts`
- Criar `packages/supabase/src/queries/macro_daily_totals.ts`
- Modificar `packages/types/src/user.ts`, `packages/types/src/database.ts`, `packages/types/src/index.ts`, `packages/supabase/src/index.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros nos packages `types` e `supabase`
- [ ] SQL de `schema.sql` corre sem erro no Supabase SQL editor (idempotente — correr duas vezes sem falhar)

**Critérios de sucesso (manuais):**
- [ ] `SELECT * FROM profiles LIMIT 1;` mostra as novas colunas com valor `NULL`
- [ ] Tabela `macro_daily_totals` existe e tem RLS activo (`SELECT * FROM macro_daily_totals` como outro utilizador devolve vazio)

### Fase 2: Fórmula de objectivos + formulário
**Ficheiros:**
- Criar `packages/config/src/macros.ts`
- Modificar `packages/config/src/index.ts`
- Criar `apps/mobile/src/hooks/useMacroGoals.ts`
- Criar `apps/mobile/src/components/macros/MacroGoalsForm.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [ ] Preencher peso=70, altura=175, idade=30, sexo=masculino, actividade=moderado, objectivo=manutenção → `meta_calorias` ≈ 2555 kcal (TMB 1673 × 1.55 × 1.0), `meta_proteinas` = 140g
- [ ] Reabrir o formulário mostra os valores já guardados (edição, não só criação)

### Fase 3: Reaproveitar lógica de F09 + sincronizar histórico
**Ficheiros:**
- Criar `apps/mobile/src/lib/macroResolution.ts`
- Modificar `apps/mobile/src/hooks/usePlannerMacros.ts` (refactor sem mudar comportamento)
- Criar `apps/mobile/src/hooks/useMacroDailyTotalsSync.ts`
- Modificar `apps/mobile/src/constants/planner.ts` (`dataDoSlot`, `diaSemanaAtual`)
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (wire do hook de sync)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros
- [ ] `planner.tsx` continua a mostrar `DayMacroBar` com os mesmos totais de antes (regressão zero de F09)

**Critérios de sucesso (manuais):**
- [ ] Adicionar uma receita ao plano semanal → `SELECT * FROM macro_daily_totals WHERE user_id = '...' ORDER BY data` mostra a linha do dia correspondente actualizada
- [ ] Remover essa receita → a linha correspondente passa a `calorias = 0`, `parcial = false` (não fica com o valor antigo)

### Fase 4: Dashboard "Hoje" + progresso visual
**Ficheiros:**
- Criar `apps/mobile/src/components/macros/MacroProgressBar.tsx`
- Criar `apps/mobile/src/components/macros/MacroProgressSection.tsx`
- Criar `apps/mobile/app/macros.tsx` (vista "hoje" + gate Premium)
- Modificar `apps/mobile/app/(tabs)/profile.tsx` (entrada de navegação)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros
- [ ] `expo lint` sem warnings

**Critérios de sucesso (manuais):**
- [ ] Utilizador `free`: botão "Ver objectivos e progresso" em `profile.tsx` navega para `/macros`, que mostra `PremiumLock`
- [ ] Utilizador Premium sem objectivos definidos: vista "hoje" mostra CTA para definir objectivos
- [ ] Utilizador Premium com objectivos e receitas planeadas hoje: barras de progresso reflectem o total correcto, com estado "excedido" quando total > meta

### Fase 5: Histórico semanal/mensal
**Ficheiros:**
- Criar `apps/mobile/src/hooks/useMacroHistory.ts`
- Criar `apps/mobile/src/components/macros/MacroHistoryView.tsx`
- Modificar `apps/mobile/app/macros.tsx` (vista "histórico")

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [ ] Vista "histórico" em modo "Semana" mostra os 7 dias da semana em vista com os totais persistidos na Fase 3
- [ ] Alternar para "Mês" mostra todos os dias do mês com dados, e a média do período nas barras de resumo
- [ ] Navegar para uma semana/mês anterior sem dados mostra lista vazia sem erro

### Fase 6: Alerta de desvio calórico
**Ficheiros:**
- Criar `apps/mobile/src/hooks/useMacroDeviationAlert.ts`
- Criar `apps/mobile/src/components/macros/MacroDeviationAlert.tsx`
- Modificar `apps/mobile/app/macros.tsx` (alerta no topo)
- Modificar `apps/mobile/app/(tabs)/index.tsx` (alerta na homepage)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [ ] Com `meta_calorias` definida e ≥4 dos últimos 7 dias em `macro_daily_totals` acima da meta → alerta visível em `macros.tsx` e na homepage
- [ ] Com <4 dias excedidos → nenhum alerta aparece
- [ ] Utilizador `free` nunca vê o alerta (mesmo com dados históricos de quando era Premium)

---

## Estratégia de Testes
- **Unit:** `calcularObjectivosDiarios` (Fase 2) — casos para os 3 objectivos × 5 níveis de actividade, sexo masculino/feminino, valores conhecidos verificados à mão
- **Unit:** `resolverMacrosPorDia` (Fase 3) — reaproveitar casos de teste existentes de `usePlannerMacros` se houver, mais o caso "dia sem receitas → não aparece no resultado"
- **Manual:** todos os critérios manuais listados por fase, correndo a app no simulador iOS com um utilizador `premium_monthly` e um `free`

## Notas de Implementação
- **Formato de `data`** em `macro_daily_totals` é sempre `YYYY-MM-DD` (sem hora), consistente com `semana_inicio` em `meal_plan` e `expira_em` em `pantry_items`
- **Custo Spoonacular:** `useMacroDailyTotalsSync` reaproveita o mesmo cache em memória e a mesma Edge Function `recipe-ingredients` já usada por `usePlannerMacros` — corre a par (mesmo `items`/`favoritos`), não duplica pedidos à API além dos que F09 já fazia; só adiciona os pedidos de escrita a `macro_daily_totals` (upsert em lote, 1 pedido por sincronização)
- **`upsertMacroDailyTotals` em lote:** sempre grava os 7 dias da semana em vista de uma vez (mesmo os vazios), para simplificar a lógica de invalidação — o custo é 7 linhas por upsert, que é desprezável
- **GDPR:** `macro_daily_totals` e os novos campos de `profiles` (peso, altura, etc.) são dados de saúde sensíveis — já cobertos pelo fluxo de eliminação de conta existente via `ON DELETE CASCADE` em `profiles`, mas confirmar antes de lançar que o fluxo de "direito ao esquecimento" (GDPR Art. 17) efectivamente apaga estas colunas/tabela (deve apagar automaticamente ao apagar `profiles`, sem trabalho extra)
- **Idade/sexo:** ver aviso no topo desta spec — decisão a validar antes de implementar

## Referências
- Research: `thoughts/shared/research/2026-07-28-macros-avancadas.md`
- Padrão de gate Premium: `apps/mobile/app/(tabs)/planner.tsx:26,67-68`
- Padrão de cálculo de macros a estender: `apps/mobile/src/hooks/usePlannerMacros.ts`
- Padrão de query genérica de update: `packages/supabase/src/queries/profile.ts`
