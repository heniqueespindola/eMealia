---
data: 2026-07-30
feature: "Perfil e Configurações + Internacionalização (PT/ES/EN) da app mobile"
research: "thoughts/shared/research/2026-07-30-perfil-e-configuracoes.md"
status: completo
---

# Spec: Perfil e Configurações + i18n global (mobile)

## Visão Geral

Reconstrói `apps/mobile/app/(tabs)/profile.tsx` num ecrã completo (foto/nome, filtros dietéticos, idioma, notificações por tipo, plano, exportação GDPR, eliminação de conta, logout) e introduz `expo-localization` + `i18n-js` com suporte **pt-PT / es-ES / en**, migrando **todas** as strings hardcoded de `apps/mobile/` para chaves de tradução (decisão do utilizador: "app inteira agora", ver research). `apps/web` e `packages/config` mantêm-se intocados — os labels partilhados aí ficam em PT, e a app mobile passa a traduzir via chaves próprias em vez de ler `.label` directamente desses pacotes.

**Decisões tomadas (perguntadas ao utilizador antes desta spec):**
- i18n: `expo-localization` + `i18n-js`, com **en** adicionado além de pt-PT/es-ES.
- Âmbito da tradução: app mobile inteira (todos os ecrãs e componentes), não só o ecrã de Perfil.
- Preferências de notificação: coluna `jsonb` `notificacoes_prefs`.
- Exportação de dados: agregação no cliente (RLS já restringe a dados próprios) + `expo-sharing`/`expo-file-system`, sem Edge Function dedicada.
- Eliminação de conta: sem reautenticação — apenas dupla confirmação via `Alert.alert`, consistente com o resto da app.

**Âmbito explicitamente fora desta spec** (herdado do ticket): alteração de email/password, mais idiomas além de pt-PT/es-ES/en, tipos de notificação além de `sugestoes_jantar`/`alertas_despensa`, Edge Functions de envio real de notificações, exportação em formatos além de JSON, `apps/web`, `packages/config` (mantido em PT, partilhado com web).

---

## Fase 1 — Base de dados e tipos partilhados

### `supabase/schema.sql`
**Modificações** (adicionar no final do bloco de `profiles`, antes da secção de `pantry_items`):
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS idioma text NOT NULL DEFAULT 'pt-PT'
  CHECK (idioma IN ('pt-PT','es-ES','en'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notificacoes_prefs jsonb NOT NULL
  DEFAULT '{"sugestoes_jantar": true, "alertas_despensa": true}'::jsonb;
```
**Novo bloco no final do ficheiro** — bucket de Storage para avatares + RLS (Supabase Storage não tem CREATE TABLE, usa `storage.buckets`/`storage.objects` já existentes no schema interno do Supabase):
```sql
-- ─── Storage: avatares de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars: leitura pública" ON storage.objects;
CREATE POLICY "avatars: leitura pública"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: upload próprio" ON storage.objects;
CREATE POLICY "avatars: upload próprio"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: update próprio" ON storage.objects;
CREATE POLICY "avatars: update próprio"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars: delete próprio" ON storage.objects;
CREATE POLICY "avatars: delete próprio"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
```
Path convention: `avatars/{user_id}/avatar.jpg` (nome de ficheiro fixo por utilizador, `upsert: true` no upload — simplifica RLS e evita acumular ficheiros órfãos).

**Acção manual obrigatória:** colar este SQL no Supabase Dashboard > SQL Editor (não há sistema de migrations neste projecto — ver aviso no topo do `schema.sql`).

### `packages/types/src/user.ts`
**Modificações:**
- Adicionar após `export type Momento = ...`:
```ts
export type Idioma = 'pt-PT' | 'es-ES' | 'en';

export interface NotificacoesPrefs {
  sugestoes_jantar: boolean;
  alertas_despensa: boolean;
}
```
- Adicionar dois campos à interface `Profile` (a seguir a `expo_push_token`):
```ts
  idioma:                Idioma;
  notificacoes_prefs:    NotificacoesPrefs;
```
**Nota:** `packages/types/src/database.ts` deriva `profiles.Row/Insert/Update` directamente de `Simplify<Profile>` (linhas 17-22) — não precisa de alteração manual, propaga automaticamente.

**Critério de sucesso:** `npm run typecheck` na raiz ainda passa (vai falhar até `updateProfile`/mocks serem ajustados nas fases seguintes se necessário).

---

## Fase 2 — Infraestrutura i18n (mobile)

### `apps/mobile/package.json`
**Modificações:** adicionar dependências (usar `npm install`, nunca `npx expo install`, per `.npmrc`):
```
expo-localization    (versão compatível com Expo 53, ex: ~16.0.x)
i18n-js               (^4.x)
expo-file-system       (~18.x, compatível Expo 53) — necessário também na Fase 5/6 (avatar + export)
expo-sharing            (~13.x, compatível Expo 53) — necessário na Fase 6 (export)
base64-arraybuffer     (^1.x) — necessário na Fase 5 (avatar upload)
```

### `apps/mobile/src/i18n/translations/pt.ts` (novo)
**Propósito:** dicionário fonte de verdade — cópia literal de todas as strings PT actualmente hardcoded na app, organizadas por namespace. Ver Fase 7 para a lista exaustiva de strings por ficheiro; a forma do objecto (todos os namespaces) é:
```ts
export const pt = {
  common: {
    cancelar: 'Cancelar', fechar: 'Fechar', guardar: 'Guardar', eliminar: 'Eliminar',
    criar: 'Criar', adicionar: '+ Adicionar', proximo: 'Próximo', concluir: 'Concluir',
    erro: 'Erro',
  },
  auth: {
    login: {
      emailLabel: 'Email', passwordLabel: 'Password', emailPlaceholder: 'teu@email.com',
      entrar: 'Entrar', semConta: 'Não tens conta? Regista-te',
      erroCamposVazios: 'Preenche o email e a password.',
    },
    register: {
      erroCamposVazios: 'Preenche todos os campos.', erroPasswordsDiferentes: 'As passwords não coincidem.',
      erroTermos: 'Tens de aceitar os termos para continuar.',
      aceitoTermos: 'Aceito os termos e a política de privacidade.',
      criarConta: 'Criar conta', jaTemConta: 'Já tens conta? Entra',
    },
  },
  errors: {
    authInvalidCredentials: 'Email ou password incorretos.',
    authEmailTaken: 'Este email já está registado.',
    authWeakPassword: 'A password deve ter pelo menos 6 caracteres.',
    authInvalidEmail: 'Introduz um email válido.',
    authGeneric: 'Ocorreu um erro. Tenta novamente.',
    semLigacaoFeed: 'Sem ligação à internet — o feed de vídeos precisa de rede.',
    semLigacaoPesquisa: 'Sem ligação à internet — a pesquisa de receitas precisa de rede.',
  },
  tabs: { inicio: 'Início', pesquisar: 'Pesquisar', favoritos: 'Favoritos', despensa: 'Despensa', plano: 'Plano', perfil: 'Perfil' },
  feed: {
    appName: 'eMealia', descobrir: 'Descobrir', aSeguir: 'A seguir',
    semCriadoresSeguidos: 'Ainda não segues nenhum criador.', explorarCriadores: 'Explorar Criadores em Destaque',
  },
  pantry: {
    titulo: 'Despensa', listaCompras: '🛒 Lista de compras',
    limiteAtingido: 'Atingiste o limite de %{limite} itens da despensa no plano grátis.',
    vazia: 'A tua despensa está vazia. Adiciona os teus primeiros ingredientes.',
    cozinharAgora: 'Cozinhar agora',
  },
  planner: {
    titulo: 'Planeamento semanal',
    premiumBloqueio: 'O planeamento semanal de refeições é uma funcionalidade Premium.',
    semReceitas: 'Ainda não tens receitas planeadas para esta semana',
    aMover: 'A mover "%{titulo}" — toca no slot de destino',
    gerarLista: 'Gerar lista da semana',
    moverPara: 'Mover para aqui', adicionar: '+ Adicionar',
    semanaDe: 'Semana de %{intervalo}',
    substituirTitulo: 'Substituir receita',
    substituirMensagem: 'Substituir "%{antigo}" por "%{novo}"?',
    substituir: 'Substituir',
    escolherReceita: 'Escolher receita',
  },
  search: {
    titulo: 'Pesquisar por ingredientes', adicionarIngrediente: 'Adicionar ingrediente',
    placeholderIngrediente: 'ex: ovo, tomate...', usarDespensa: 'Usar despensa',
    premiumBloqueio: 'A pesquisa ilimitada é uma funcionalidade Premium.',
    semIngredientes: 'Adiciona pelo menos um ingrediente para pesquisar.',
    semResultados: 'Nenhuma receita encontrada com estes ingredientes/filtros.',
  },
  favoritos: {
    titulo: 'Favoritos', eliminarColecaoTitulo: 'Eliminar coleção',
    eliminarColecaoMensagem: 'Eliminar a coleção "%{nome}"? As receitas guardadas nesta coleção também serão removidas.',
    novaColecao: '+ Nova coleção', colecaoVazia: 'Ainda não guardaste nenhuma receita nesta coleção.',
    itensAdicionados: '%{count} itens adicionados à lista', tudoEmCasa: 'Já tens tudo o que precisas em casa',
  },
  macros: {
    titulo: 'Dashboard de Macros', premiumBloqueio: 'A contagem avançada de macros é uma funcionalidade Premium.',
    hoje: 'Hoje', objectivos: 'Objectivos', historico: 'Histórico', semana: 'Semana', mes: 'Mês',
    semObjectivos: 'Ainda não definiste os teus objectivos nutricionais.',
    definirPrimeiro: 'Define os teus objectivos primeiro',
    calorias: 'Calorias', proteinas: 'Proteínas', hidratos: 'Hidratos', gorduras: 'Gorduras',
    excedido: 'excedido', parcial: 'parcial', mediaPeriodo: 'Média do período',
    semDados: 'Sem dados para este período.', semanaDe: 'Semana de %{intervalo}',
    excedeuObjectivo: 'Excedeste o teu objectivo calórico em %{dias} dos últimos 7 dias.',
  },
  profile: {
    titulo: 'Perfil',
    seccaoPerfil: 'Perfil', editarFoto: 'Editar foto', nomeLabel: 'Nome', emailLabel: 'Email',
    seccaoPreferencias: 'Preferências', filtrosDieteticos: 'Filtros dietéticos', idioma: 'Idioma',
    notificacoes: 'Notificações', notifSugestoesJantar: 'Sugestões de jantar', notifAlertasDespensa: 'Alertas de despensa',
    seccaoPlano: 'Plano', planoActual: 'Plano actual', renovaA: 'Renova a %{data}',
    fazerUpgrade: 'Fazer upgrade', gerirSubscricao: 'Gerir subscrição',
    dashboardMacros: 'Dashboard de Macros', verObjectivos: 'Ver objectivos e progresso', restaurarCompras: 'Restaurar compras',
    seccaoPrivacidade: 'Privacidade',
    exportarDados: 'Exportar os meus dados', exportarDadosDescricao: 'Recebe uma cópia de todos os teus dados em formato JSON.',
    eliminarConta: 'Eliminar conta', eliminarContaTitulo: 'Eliminar conta',
    eliminarContaMensagem: 'Esta acção é irreversível e remove todos os teus dados. Continuar?',
    terminarSessao: 'Terminar sessão', terminarSessaoTitulo: 'Terminar sessão',
    terminarSessaoMensagem: 'Tens a certeza que queres sair?',
    erroUpload: 'Não foi possível carregar a foto. Tenta novamente.',
    erroExportar: 'Não foi possível exportar os teus dados. Tenta novamente.',
    erroEliminarConta: 'Não foi possível eliminar a conta. Tenta novamente.',
  },
  onboarding: {
    step1Titulo: 'Bem-vindo(a) à eMealia',
    step1Subtitulo: 'Cozinha o que tens, descobre o que queres. Conta-nos as tuas preferências para começar.',
    step2Titulo: 'Vamos conhecer a tua despensa',
    step2Subtitulo: 'Selecciona pelo menos 3 ingredientes que costumas ter em casa.',
    step3Titulo: 'Últimos detalhes', step3Subtitulo: 'Escolhe os teus filtros favoritos e com que frequência cozinhas.',
    frequenciaCozinha: 'Com que frequência costumas cozinhar?',
    erroSessao: 'Sessão expirada. Volta a fazer login para continuar.',
    erroGuardarPerfil: 'Não foi possível guardar o teu perfil. Tenta novamente.',
    erroConcluir: 'Não foi possível concluir o onboarding. Tenta novamente.',
  },
  creators: {
    videosRecentes: 'Vídeos recentes', semVideos: 'Ainda sem vídeos.',
    titulo: 'Criadores em Destaque', semCriadores: 'Ainda não há criadores em destaque.',
  },
  recipe: {
    fechar: 'Fechar', calorias: 'Calorias', proteinas: 'Proteínas', hidratos: 'Hidratos', gorduras: 'Gorduras',
    abrirOriginal: 'Abrir receita original', adicionarListaCompras: 'Adicionar à lista de compras',
    semIngredientesEstruturados: 'Esta receita não tem lista de ingredientes estruturada.',
    disponiveis: '%{disponiveis}/%{total} disponíveis',
    moverColecao: 'Mover para coleção',
    novaColecaoTitulo: 'Nova coleção', colecaoDuplicada: 'Já existe uma coleção com este nome.',
    novaColecaoPlaceholder: 'ex: Sobremesas',
  },
  shopping: {
    titulo: 'Lista de compras', fechar: 'Fechar', porComprar: 'Por comprar:', comprados: 'Comprados:',
    limparListaTitulo: 'Limpar lista', limparListaMensagem: 'Eliminar todos os itens?',
    vazia: 'A tua lista de compras está vazia.', partilhar: 'Partilhar',
    exportarLembretes: 'Exportar para Lembretes/Tasks', limparLista: 'Limpar lista',
    adicionarItem: 'Adicionar item', adicionarItemPlaceholder: 'Adicionar item…',
    exportarPremiumBloqueio: 'A exportação para Lembretes/Tasks é uma funcionalidade Premium.',
  },
  paywall: {
    fazerUpgrade: 'Fazer upgrade', fechar: 'Fechar',
    comprasIndisponiveis: 'As opções de compra não estão disponíveis de momento.',
    subscricaoAtivadaTitulo: 'Subscrição activada', subscricaoAtivadaMensagem: 'O teu plano %{plano} está activo.',
    compraFalhouTitulo: 'Não foi possível completar a compra', compraFalhouMensagem: 'Tenta novamente mais tarde.',
    comprasRestauradasTitulo: 'Compras restauradas', comprasRestauradasMensagem: 'O teu plano foi actualizado.',
    restaurarCompras: 'Restaurar compras',
    planoMensalBotao: 'Premium Mensal — €%{preco}/mês', planoAnualBotao: 'Premium Anual — €%{preco}/ano',
  },
  planComparison: {
    melhorValor: 'Melhor valor',
    featurePlaneamentoSemanal: 'Planeamento semanal', featureMacros: 'Contagem de macros',
    featureExportLembretes: 'Export para Lembretes/Tasks', featureDespensaIlimitada: 'Despensa ilimitada',
    featureFavoritosIlimitados: 'Favoritos ilimitados',
  },
  pantryForm: {
    editarItem: 'Editar item', adicionarItem: 'Adicionar item', nome: 'Nome', quantidade: 'Quantidade',
    validade: 'Validade (AAAA-MM-DD)', categoria: 'Categoria', lerCodigoBarras: 'Ler código de barras',
    produtoNaoEncontrado: 'Produto não encontrado. Preenche os dados manualmente.',
    limiteAtingido: 'Atingiste o limite de %{limite} itens da despensa no plano grátis.',
    erroFormatoData: 'Usa o formato AAAA-MM-DD.',
    eliminarTitulo: 'Eliminar item', eliminarMensagem: 'Eliminar "%{nome}" da despensa?',
    expiraEmBreve: 'Expira em breve',
  },
  barcodeScanner: {
    permissaoMensagem: 'Precisamos de acesso à câmara para ler códigos de barras.',
    permitirCamara: 'Permitir câmara',
  },
  macroGoalsForm: {
    sexoBiologico: 'Sexo biológico', masculino: 'Masculino', feminino: 'Feminino',
    nivelActividade: 'Nível de actividade', objectivo: 'Objectivo',
  },
  offline: { banner: 'Modo offline — algumas funcionalidades podem não estar disponíveis' },
  config: {
    planos: { free: 'Grátis', premium_monthly: 'Premium Mensal', premium_annual: 'Premium Anual' },
    filtros: {
      vegan: 'Vegan', vegetariano: 'Vegetariano', sem_gluten: 'Sem Glúten', sem_lactose: 'Sem Lactose',
      airfryer: 'Airfryer', rapida: 'Rápida (< 30min)', fria: 'Sem cozedura', sobremesa: 'Sobremesa',
      pequeno_almoco: 'Pequeno-almoço',
    },
    colecoes: { favoritos: 'Favoritos', para_experimentar: 'Para experimentar', semana: 'Semana' },
    fontesFavoritos: { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', spoonacular: 'Spoonacular' },
    niveisActividade: {
      sedentario: 'Sedentário (pouco ou nenhum exercício)', ligeiro: 'Ligeiro (exercício 1-3x/semana)',
      moderado: 'Moderado (exercício 3-5x/semana)', intenso: 'Intenso (exercício 6-7x/semana)',
      muito_intenso: 'Muito intenso (atleta, 2x/dia)',
    },
    objectivosNutricionais: { perda_peso: 'Perda de peso', manutencao: 'Manutenção', ganho_peso: 'Ganho de peso' },
  },
} as const;
```
**Nota:** as chaves exactas de `config.niveisActividade`/`config.objectivosNutricionais` devem ser confirmadas contra os `value`s reais em `packages/config/src/macros.ts` (`NIVEIS_ACTIVIDADE`, `OBJECTIVOS_NUTRICIONAIS`) durante a implementação — os nomes acima são inferidos do research e podem não corresponder 1:1 aos `value` internos.

### `apps/mobile/src/i18n/translations/es.ts` e `en.ts` (novos)
**Propósito:** mesma forma exacta de `pt.ts` (mesmas chaves aninhadas), com traduções em espanhol e inglês respectivamente. Devem ser escritos manualmente por quem implementa (traduções de qualidade, não geradas automaticamente) — usar `pt.ts` como checklist de chaves em falta.

### `apps/mobile/src/i18n/translations/index.ts` (novo)
```ts
import { pt } from './pt';
export type TranslationDict = typeof pt;
export { pt } from './pt';
export { es } from './es';
export { en } from './en';
```

### `apps/mobile/src/i18n/index.ts` (novo)
```ts
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { pt, es, en } from './translations';
import type { Idioma } from '@emealia/types';

export const i18n = new I18n({ pt, es, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'pt';
i18n.locale = deviceLocale();

const IDIOMA_TO_LOCALE: Record<Idioma, 'pt' | 'es' | 'en'> = { 'pt-PT': 'pt', 'es-ES': 'es', en: 'en' };

export function setLocale(idioma: Idioma | null | undefined) {
  i18n.locale = idioma ? IDIOMA_TO_LOCALE[idioma] : deviceLocale();
}

function deviceLocale(): 'pt' | 'es' | 'en' {
  const tag = Localization.getLocales()[0]?.languageCode;
  if (tag === 'es') return 'es';
  if (tag === 'en') return 'en';
  return 'pt';
}
```

### `apps/mobile/src/hooks/useTranslation.ts` (novo)
```ts
import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { i18n, setLocale } from '@/i18n';

export function useTranslation() {
  const idioma = useProfileStore((s) => s.profile?.idioma);

  useEffect(() => { setLocale(idioma); }, [idioma]);

  return { t: i18n.t.bind(i18n), idioma: i18n.locale };
}
```
Pré-login (ecrãs `(auth)/`), `profile` é `null` na store → `idioma` é `undefined` → cai no locale do dispositivo. Depois do login, sincroniza automaticamente com `profile.idioma` assim que o perfil é carregado (`useProfile` em `app/_layout.tsx`).

### `apps/mobile/src/i18n/formatDate.ts` (novo)
**Propósito:** substituir os 3 usos hardcoded de `new Intl.DateTimeFormat('pt-PT', ...)` por uma versão que respeita o idioma activo.
```ts
import type { Idioma } from '@emealia/types';

const IDIOMA_TO_BCP47: Record<Idioma, string> = { 'pt-PT': 'pt-PT', 'es-ES': 'es-ES', en: 'en-US' };

export function formatarData(date: Date, idioma: Idioma | null | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }) {
  return new Intl.DateTimeFormat(idioma ? IDIOMA_TO_BCP47[idioma] : 'pt-PT', options).format(date);
}
```

**Critérios de sucesso automáticos (Fase 2):**
- [x] `tsc --noEmit` em `apps/mobile` passa (dicionários `es.ts`/`en.ts` têm a mesma forma de `pt.ts` — usar `satisfies TranslationDict` na declaração de cada um para garantir isto em tempo de compilação)

---

## Fase 3 — `packages/config` e `src/constants`: chaves em vez de labels

**Decisão de arquitectura:** `packages/config` é partilhado com `apps/web` (fora de âmbito) — **não** alterar a estrutura desses arrays. Em vez disso, cada local do mobile que hoje lê `.label` desses arrays passa a chamar `t(\`config.<namespace>.${value}\`)`, usando o `value` (já existente) como chave de tradução.

### Ficheiros mobile-only em `apps/mobile/src/constants/` — migrar para `{ value, labelKey }`
Estes **não** são partilhados com o web, por isso podem ser reestruturados directamente:

- **`apps/mobile/src/constants/onboarding.ts`** — `OPCOES_PREFERENCIAS_DIETETICAS`, `INGREDIENTES_COMUNS`, `OPCOES_FILTROS_FAVORITOS`, `OPCOES_FREQUENCIA_COZINHA`: trocar `label: 'X'` por `labelKey: 'onboarding.opcoes.X'`; adicionar as chaves correspondentes a `pt.ts`/`es.ts`/`en.ts` sob `onboarding.opcoes.*`. Locais que consomem (`onboarding/step1.tsx`, `step2.tsx`, `step3.tsx`) passam a fazer `t(opcao.labelKey)`.
- **`apps/mobile/src/constants/feedFilters.ts`** (`FEED_FILTER_OPTIONS`) — mesmo padrão, chaves sob `feed.filtros.*`.
- **`apps/mobile/src/constants/pantry.ts`** (`CATEGORIAS_DESPENSA` + labels de secção) — chaves sob `pantry.categorias.*`.
- **`apps/mobile/src/constants/favoritos.ts`** — chaves sob `favoritos.opcoes.*`.
- **`apps/mobile/src/constants/shopping.ts`** (labels "Por comprar"/"Comprados") — já cobertos por `shopping.porComprar`/`shopping.comprados` em `pt.ts` (Fase 2); remover os literais destes ficheiro e importar de `t()` no local de uso.
- **`apps/mobile/src/constants/planner.ts`** — `DIAS_SEMANA`, `MOMENTOS`: chaves sob `planner.dias.*`/`planner.momentos.*`. `formatarIntervaloSemana` (usa `Intl.DateTimeFormat('pt-PT', ...)`) — alterar assinatura para aceitar `idioma: Idioma` e usar `formatarData` da Fase 2; actualizar as 2 chamadas (`planner.tsx`, `MacroHistoryView.tsx`/`WeekNavigator.tsx`, conforme aplicável).
- **`apps/mobile/src/constants/mockFeed.ts`** — fora de âmbito (dados de mock/dev, não visível a utilizadores reais).

### Locais que leem `.label` de `packages/config` diretamente — trocar por `t()`
| Ficheiro | Uso actual | Novo uso |
|---|---|---|
| `apps/mobile/app/(tabs)/profile.tsx` (→ `PlanSection.tsx`, Fase 5) | `PLANS[profile.plano].label` | `t(\`config.planos.${profile.plano}\`)` |
| `apps/mobile/src/components/recipe/FilterRow.tsx` | `FILTROS_DIETETICOS.map(f => f.label)` | `t(\`config.filtros.${f.value}\`)` |
| `apps/mobile/src/components/recipe/RecipeCard.tsx`, `RecipeDetailModal.tsx`, `SavedRecipeCard.tsx` | labels de filtros/fonte | idem, via `t()` |
| `apps/mobile/src/components/macros/MacroGoalsForm.tsx` | `NIVEIS_ACTIVIDADE`/`OBJECTIVOS_NUTRICIONAIS` labels + `SEXOS` local array | `t(\`config.niveisActividade.${v}\`)`, `t(\`config.objectivosNutricionais.${v}\`)`, `t('macroGoalsForm.masculino'/'feminino')` |
| `apps/mobile/src/components/paywall/PlanComparisonTable.tsx` | `FEATURE_LABELS` map + `PLANS[...].label` | `t('planComparison.feature*')` + `t('config.planos.*')` |
| `apps/mobile/src/components/paywall/PaywallModal.tsx` | labels de plano/preço | `t('paywall.planoMensalBotao', { preco })` etc. |
| `app/(tabs)/favoritos.tsx`, `index.tsx`, `pantry.tsx`, `planner.tsx`, `macros.tsx`, `search.tsx` | vários usos pontuais de `.label` de filtros/coleções/fontes | `t(\`config.<namespace>.${value}\`)` |

**Critério de sucesso:** nenhum import de `.label` de `@emealia/config` sobrevive em `apps/mobile` fora dos ficheiros de `packages/config` em si (`grep -rn "\.label" apps/mobile/src apps/mobile/app` não deve devolver leituras directas de `PLANS`/`FILTROS_DIETETICOS`/etc — só chamadas a `t(...)`).

**[x] Concluído.** Restam apenas 2 resultados no grep, ambos esperados: `RecipeDetailModal.tsx` (`m.label` de um array local de macros, não de `@emealia/config` — tradução agendada para a Fase 7) e `app/(tabs)/profile.tsx:59` (`PLANS[profile.plano].label`, deliberadamente adiado para a Fase 5 onde o ecrã é reescrito).

---

## Fase 4 — Backend: Storage, exportação e eliminação de conta

### `packages/supabase/src/storage/avatar.ts` (novo)
**Propósito:** upload platform-agnostic — recebe bytes já preparados (o RN-specific file reading fica em `apps/mobile`, para não acoplar `packages/supabase` a `expo-file-system`, já que este pacote é partilhado com `apps/web`).
```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadAvatar(client: SupabaseClient, userId: string, fileData: ArrayBuffer, contentType = 'image/jpeg') {
  const path = `${userId}/avatar.jpg`;
  const { error } = await client.storage.from('avatars').upload(path, fileData, { contentType, upsert: true });
  if (error) return { data: null, error };
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  return { data: { publicUrl: `${data.publicUrl}?t=${Date.now()}` }, error: null };
}
```
`?t=${Date.now()}` invalida cache de imagem no cliente já que o path é sempre o mesmo (`upsert: true`).

### `packages/supabase/src/index.ts`
**Modificações:** adicionar `export * from './storage/avatar';`

### `packages/supabase/src/queries/meal_plan.ts`
**Modificações:** adicionar nova função (não alterar `getMealPlanSemana` existente):
```ts
export async function getMealPlanTodas(client: SupabaseClient<Database>, userId: string) {
  return client
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .order('semana_inicio', { ascending: true })
    .order('dia_semana', { ascending: true });
}
```

### `packages/supabase/src/queries/export.ts` (novo)
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';
import { getProfile } from './profile';
import { getPantry } from './pantry';
import { getSavedRecipes } from './recipes';
import { getShoppingList } from './shopping_list';
import { getMealPlanTodas } from './meal_plan';
import { getFollowedCreators } from './creators';

export async function exportUserData(client: SupabaseClient<Database>, userId: string) {
  const [profile, pantry, savedRecipes, shoppingList, mealPlan, followedCreators] = await Promise.all([
    getProfile(client, userId),
    getPantry(client, userId),
    getSavedRecipes(client, userId),
    getShoppingList(client, userId),
    getMealPlanTodas(client, userId),
    getFollowedCreators(client, userId),
  ]);

  return {
    exportado_em:      new Date().toISOString(),
    profile:           profile.data,
    pantry_items:      pantry.data,
    saved_recipes:     savedRecipes.data,
    shopping_list:     shoppingList.data,
    meal_plan:         mealPlan.data,
    followed_creators: followedCreators.data,
  };
}
```

### `packages/supabase/src/index.ts`
**Modificações (continuação):** adicionar `export * from './queries/export';`

### `supabase/functions/delete-account/index.ts` (novo)
**Propósito:** primeira Edge Function do projecto a identificar o utilizador chamador via JWT (em vez de confiar em parâmetros do body) — ver padrão documentado no research.
```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: 'falha ao eliminar conta' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
```
**Acção manual:** `supabase functions deploy delete-account` (ou equivalente no Dashboard) — este projecto não tem CI de deploy automático de funções documentado.

**Critérios de sucesso (Fase 4):**
- [x] `tsc --noEmit` passa em `packages/supabase`
- [ ] Bucket `avatars` visível no Supabase Dashboard > Storage após correr o SQL da Fase 1
- [ ] Invocar `delete-account` sem header `Authorization` devolve 401 (testável via `curl` contra o URL da função) — requer `supabase functions deploy delete-account` primeiro

---

## Fase 5 — Ecrã de Perfil e Configurações

Reestruturar `apps/mobile/app/(tabs)/profile.tsx` em 5 secções, cada uma um componente próprio em `apps/mobile/src/components/profile/` (regra CLAUDE.md: máx 150 linhas/ficheiro — o ecrã actual já tem lógica de plano que sozinha ocupa ~45 linhas).

### `apps/mobile/src/components/ui/Switch.tsx` (novo)
```tsx
import { Switch as RNSwitch } from 'react-native';
import { colors } from '@/constants/theme';

interface SwitchProps { value: boolean; onValueChange: (v: boolean) => void; }

export function Switch({ value, onValueChange }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
    />
  );
}
```

### `apps/mobile/src/components/profile/AvatarPicker.tsx` (novo)
**Conteúdo:** avatar circular (imagem actual ou placeholder) + botão "Editar foto" (`t('profile.editarFoto')`). Ao tocar:
```tsx
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { uploadAvatar } from '@emealia/supabase';
import { updateProfile } from '@emealia/supabase';
// ...
async function escolherFoto() {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return;
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1],
  });
  if (resultado.canceled) return;
  setUploading(true);
  const base64 = await FileSystem.readAsStringAsync(resultado.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
  const { data, error } = await uploadAvatar(supabase!, userId, decode(base64));
  if (data) {
    const { data: p } = await updateProfile(supabase!, userId, { avatar_url: data.publicUrl });
    if (p) useProfileStore.getState().setProfile(p);
  } else {
    Alert.alert(t('common.erro'), t('profile.erroUpload'));
  }
  setUploading(false);
}
```
Adicionar `expo-image-picker` ao array `plugins` de `apps/mobile/app.json` (actualmente ausente — a permissão iOS `NSPhotoLibraryUsageDescription` já existe em `infoPlist`, mas o plugin em si não está listado).

### `apps/mobile/src/components/profile/ProfileInfoSection.tsx` (novo)
**Conteúdo:** `Card` com `AvatarPicker` + `Input` para nome (editável, `onBlur` ou botão "Guardar" chama `updateProfile(supabase!, userId, { nome })` + `setProfile`) + `Text` read-only para email (`profile.email`, sem `Input`, sem edição — nota técnica do ticket).

### `apps/mobile/src/components/profile/DietaryFiltersSection.tsx` (novo)
**Conteúdo:** `Card` com título `t('profile.filtrosDieteticos')`, grid de `Pill` usando `FILTROS_DIETETICOS` (todos os 9, não o subconjunto de onboarding) com label `t(\`config.filtros.${f.value}\`)`, seguindo o padrão de `toggleFiltro` de `onboarding/step3.tsx` (ver research), seed inicial a partir de `profile.filtros_dieteticos`. Cada toggle chama `updateProfile(supabase!, userId, { filtros_dieteticos: novosFiltros })` + `setProfile`.

### `apps/mobile/src/components/profile/LanguageSection.tsx` (novo)
**Conteúdo:** `Card` com título `t('profile.idioma')`, 3 `Pill` (Português/Español/English — rotulados sempre no próprio idioma, não traduzidos) para `pt-PT`/`es-ES`/`en`. Ao seleccionar:
```tsx
async function selecionarIdioma(novoIdioma: Idioma) {
  setLocale(novoIdioma); // efeito imediato na UI, antes do round-trip à rede
  const { data } = await updateProfile(supabase!, userId, { idioma: novoIdioma });
  if (data) useProfileStore.getState().setProfile(data);
}
```

### `apps/mobile/src/components/profile/NotificationPrefsSection.tsx` (novo)
**Conteúdo:** `Card` com título `t('profile.notificacoes')`, duas linhas `Switch` + label (`notifSugestoesJantar`/`notifAlertasDespensa`), lidas/escritas em `profile.notificacoes_prefs`:
```tsx
async function toggleNotif(chave: keyof NotificacoesPrefs, valor: boolean) {
  const novo = { ...profile.notificacoes_prefs, [chave]: valor };
  const { data } = await updateProfile(supabase!, userId, { notificacoes_prefs: novo });
  if (data) useProfileStore.getState().setProfile(data);
}
```

### `apps/mobile/src/components/profile/PlanSection.tsx` (novo)
**Conteúdo:** mover tal-e-qual as linhas 49-92 actuais de `profile.tsx` (Card de plano + `dataRenovacao` via `Purchases.getCustomerInfo()` + Card de Dashboard de Macros + botão "Restaurar compras"), só trocando os literais PT por `t('profile.*')`/`t('config.planos.*')` e `formatarData(date, idioma)` em vez de `Intl.DateTimeFormat('pt-PT', ...)` fixo.

### `apps/mobile/src/components/profile/PrivacySection.tsx` (novo)
**Conteúdo:** `Card` com título `t('profile.seccaoPrivacidade')`:
- Botão "Exportar os meus dados" (`t('profile.exportarDados')`) + descrição (`t('profile.exportarDadosDescricao')`):
```tsx
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportUserData } from '@emealia/supabase';

async function handleExportar() {
  setExporting(true);
  try {
    const dados = await exportUserData(supabase!, userId);
    const uri = FileSystem.documentDirectory + `emealia-dados-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(dados, null, 2));
    await Sharing.shareAsync(uri, { mimeType: 'application/json' });
  } catch {
    Alert.alert(t('common.erro'), t('profile.erroExportar'));
  } finally {
    setExporting(false);
  }
}
```
- Botão destrutivo "Eliminar conta" (`t('profile.eliminarConta')`):
```tsx
function confirmarEliminarConta() {
  Alert.alert(t('profile.eliminarContaTitulo'), t('profile.eliminarContaMensagem'), [
    { text: t('common.cancelar'), style: 'cancel' },
    { text: t('profile.eliminarConta'), style: 'destructive', onPress: eliminarConta },
  ]);
}

async function eliminarConta() {
  const { error } = await supabase!.functions.invoke('delete-account');
  if (error) { Alert.alert(t('common.erro'), t('profile.erroEliminarConta')); return; }
  await signOut();
  router.replace('/(auth)/login');
}
```

### `apps/mobile/app/(tabs)/profile.tsx` (reescrever por completo)
**Conteúdo:** ecrã fino que só compõe as secções acima dentro do `ScrollView` existente + botão de logout no fim:
```tsx
function confirmarLogout() {
  Alert.alert(t('profile.terminarSessaoTitulo'), t('profile.terminarSessaoMensagem'), [
    { text: t('common.cancelar'), style: 'cancel' },
    { text: t('profile.terminarSessao'), style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login'); } },
  ]);
}
```
Ordem das secções: `ProfileInfoSection` → `DietaryFiltersSection` → `LanguageSection` → `NotificationPrefsSection` → `PlanSection` → `PrivacySection` → botão "Terminar sessão".

**Critérios de sucesso (Fase 5, manuais):**
- [ ] Editar nome reflecte-se imediatamente sem reiniciar a app
- [ ] Trocar foto actualiza o avatar visível de imediato (testar em simulador/dispositivo)
- [ ] Trocar idioma muda o texto do ecrã de Perfil imediatamente, sem reiniciar
- [ ] Desligar "Alertas de despensa" mantém "Sugestões de jantar" activo (testar persistência: sair e voltar ao ecrã)
- [ ] Exportar dados abre o share sheet nativo com um ficheiro `.json` válido (abrir e confirmar conteúdo)
- [ ] Eliminar conta remove o utilizador de `auth.users` (confirmar no Dashboard) e redirecciona para login
- [ ] Logout com confirmação funciona e cancela correctamente se "Cancelar" for tocado

**Automáticas (confirmadas):** `tsc --noEmit` e `expo lint` em `apps/mobile` passam sem novos erros/avisos.

---

## Fase 6 — `app.json`
**Modificações:**
- Adicionar `"expo-image-picker"` ao array `plugins` (ver Fase 5).
- Confirmar se `expo-sharing`/`expo-file-system` requerem entrada em `plugins` (normalmente não, mas verificar changelog da versão instalada durante implementação).

**[x] Concluído.** `expo-image-picker` adicionado como string simples (sem opções) — inspeccionei `applyPermissions` em `@expo/config-plugins` e confirmei a precedência `permissions[permission] || infoPlist[permission] || description`, ou seja, não sobrepõe o `NSPhotoLibraryUsageDescription` PT já existente em `infoPlist`. `expo-file-system` tem `app.plugin.js` mas só adiciona permissões Android de storage externo que não usamos (escrevemos em `documentDirectory`, privado à app) — não adicionado. `expo-sharing` não tem `app.plugin.js` — não adicionado. `app.json` validado como JSON.

---

## Fase 7 — Tradução global de strings (restante da app)

Com a infraestrutura (Fase 2-3) e o dicionário `pt.ts` já a cobrir os namespaces `auth`, `errors`, `tabs`, `feed`, `pantry`, `planner`, `search`, `favoritos`, `macros`, `onboarding`, `creators`, `recipe`, `shopping`, `paywall`, `planComparison`, `pantryForm`, `barcodeScanner`, `macroGoalsForm`, `offline`, esta fase troca cada string hardcoded pelos `t('namespace.chave')` correspondentes. Cada ficheiro abaixo: importar `useTranslation` de `@/hooks/useTranslation`, chamar `const { t } = useTranslation();` no topo do componente, substituir literais.

### `apps/mobile/app/(auth)/`
| Ficheiro | Chaves |
|---|---|
| `login.tsx` | `auth.login.*`, `errors.auth*` (via `getAuthErrorMessage`, ver `lib/authErrors.ts` abaixo) |
| `register.tsx` | `auth.register.*`, `errors.auth*` |

### `apps/mobile/src/lib/authErrors.ts`
**Modificações:** `getAuthErrorMessage()` deixa de devolver strings literais; passa a devolver a **chave** de tradução (ex: `'errors.authInvalidCredentials'`), e os call sites (`login.tsx`, `register.tsx`) fazem `t(getAuthErrorMessage(error))`.

### `apps/mobile/app/(tabs)/`
| Ficheiro | Chaves |
|---|---|
| `_layout.tsx` | `tabs.*` (títulos das tabs) |
| `favoritos.tsx` | `favoritos.*` |
| `index.tsx` | `feed.*` |
| `pantry.tsx` | `pantry.*` |
| `planner.tsx` | `planner.*` |
| `search.tsx` | `search.*` |
| `profile.tsx` | já coberto na Fase 5 |

### `apps/mobile/app/` (restantes rotas)
| Ficheiro | Chaves |
|---|---|
| `creators/[id].tsx` | `creators.videosRecentes`, `creators.semVideos` |
| `creators/index.tsx` | `creators.titulo`, `creators.semCriadores` |
| `macros.tsx` | `macros.*` |
| `onboarding/step1.tsx` | `onboarding.step1*`, `common.proximo` |
| `onboarding/step2.tsx` | `onboarding.step2*`, `common.proximo` |
| `onboarding/step3.tsx` | `onboarding.step3*`, `onboarding.frequenciaCozinha`, `onboarding.erro*`, `common.concluir` |

### `apps/mobile/src/components/`
| Ficheiro | Chaves |
|---|---|
| `creators/FollowButton.tsx` | novo par `creators.aSeguir`/`creators.seguir` |
| `macros/MacroDeviationAlert.tsx` | `macros.excedeuObjectivo` |
| `macros/MacroGoalsForm.tsx` | `macroGoalsForm.*`, `config.niveisActividade.*`, `config.objectivosNutricionais.*`, `common.guardar` |
| `macros/MacroHistoryView.tsx` | `macros.semana`/`macros.mes`/`macros.semanaDe`/`macros.mediaPeriodo`/`macros.calorias`+`proteinas`+`hidratos`+`gorduras`/`macros.semDados`/`macros.excedido`; usar `formatarData` para o intervalo |
| `macros/MacroProgressBar.tsx` | `macros.excedido` (se ainda hardcoded após props) |
| `macros/MacroProgressSection.tsx` | `macros.hoje`, `macros.parcial`, `macros.calorias`+`proteinas`+`hidratos`+`gorduras` |
| `pantry/BarcodeScanner.tsx` | `barcodeScanner.*`, `common.cancelar` |
| `pantry/PantryItemCard.tsx` | `pantryForm.eliminarTitulo`/`eliminarMensagem`, `common.cancelar`/`eliminar`, `pantryForm.expiraEmBreve` |
| `pantry/PantryItemForm.tsx` | `pantryForm.*`, `common.cancelar`/`guardar` |
| `paywall/PaywallModal.tsx` | `paywall.*` |
| `paywall/PlanComparisonTable.tsx` | `planComparison.*`, `config.planos.*` |
| `paywall/PremiumLock.tsx` | `paywall.fazerUpgrade` (mensagem continua a vir por prop dos call sites, já cobertos acima) |
| `planner/PlannerFavoritosTab.tsx` | `favoritos.colecaoVazia` (reaproveitar) ou nova chave `planner.semFavoritos` |
| `planner/PlannerRecipePickerModal.tsx` | `planner.escolherReceita`, `common.fechar`, `favoritos.titulo`, `search.titulo` |
| `planner/PlannerSearchTab.tsx` | `search.adicionarIngrediente`/`placeholderIngrediente`/`usarDespensa`/`semIngredientes` |
| `planner/PlannerSlotCard.tsx` | nova chave `planner.removerTitulo`/`removerMensagem`, `common.cancelar`, nova chave `planner.remover` |
| `planner/PlannerSlotEmpty.tsx` | `planner.moverPara`, `common.adicionar` |
| `planner/WeekNavigator.tsx` | `planner.semanaDe` via `formatarData` |
| `recipe/ColecaoPickerModal.tsx` | `recipe.moverColecao`, `common.cancelar` |
| `recipe/CreateColecaoModal.tsx` | `recipe.novaColecaoTitulo`, `common.cancelar`, `recipe.colecaoDuplicada`, `common.criar`, `recipe.novaColecaoPlaceholder` |
| `recipe/FilterRow.tsx` | `config.filtros.*` |
| `recipe/RecipeCard.tsx` | `recipe.disponiveis` |
| `recipe/RecipeDetailModal.tsx` | `recipe.fechar`/`calorias`+`proteinas`+`hidratos`+`gorduras`/`abrirOriginal`/`adicionarListaCompras`/`semIngredientesEstruturados`, `config.filtros.*` |
| `shopping/ShoppingListAddForm.tsx` | `shopping.adicionarItem`/`adicionarItemPlaceholder`, `common.adicionar` |
| `shopping/ShoppingListModal.tsx` | `shopping.*`, `common.fechar`/`cancelar`/`eliminar` |
| `ui/OfflineBanner.tsx` | `offline.banner` |

**Não traduzir** (nomes próprios/marcas, decisão explícita por serem iguais em todas as línguas): `feed/SourceBadge.tsx` (labels "YouTube"/"TikTok"/"Instagram"/"eMealia"/"Spoonacular"/"Blog"). **Fora de âmbito:** `constants/mockFeed.ts` (dados de desenvolvimento).

**Critérios de sucesso automáticos (Fase 7):**
- [x] `tsc --noEmit` em `apps/mobile` passa
- [x] Heurística de literais residuais — corri um grep próprio (`>[A-ZÀ-Ú]...<` e `"[A-ZÀ-Ú]..."` em `app/` e `src/components/`) em vez do grep sugerido (que não aplica bem a JSX multi-linha); só sobrou 1 falso-positivo (`m.label` de array local em `RecipeDetailModal.tsx`, não é `.label` de config), corrigido.

**Critérios de sucesso manuais (Fase 7):**
- [ ] Trocar idioma em `LanguageSection` (Fase 5) e navegar por Início/Pesquisar/Despensa/Planeador/Favoritos/Macros/Perfil — todo o texto visível muda de idioma, nenhum ecrã fica misto PT+ES/EN
- [ ] Ecrãs de login/registo (pré-sessão) respeitam o idioma do dispositivo (testar simulador com idioma ES e EN nas definições do sistema)

---

## Estratégia de Testes
- **Unit:** nenhum framework de testes automatizados existe actualmente no projecto (fora de âmbito introduzir um) — validar via `tsc --noEmit` + `expo lint` em cada fase.
- **Manual:** ver critérios de sucesso manuais em cada fase; testar em simulador iOS e emulador Android (build de development), com o idioma do dispositivo em PT, ES e EN para validar o fallback de `useTranslation`.

## Notas de Implementação

- **Ordem obrigatória:** Fase 1 (DB+tipos) → Fase 2 (infra i18n) → Fase 3 (config/constants) → Fase 4 (backend) → Fase 5 (ecrã Perfil) → Fase 6 (app.json) → Fase 7 (resto da app). Fases 3 e 7 dependem de Fase 2 estar completa (dicionário + hook). Fase 5 depende de Fases 1, 2 e 4.
- **Volume:** Fase 7 sozinha toca ~35 ficheiros. Seguir a regra do `CLAUDE.md` de nunca exceder 50% da context window numa fase — `/clear` entre Fase 5 e Fase 7 é fortemente recomendado, e possivelmente dividir a própria Fase 7 em duas sessões de `/implement` (ex: `app/` primeiro, `src/components/` depois).
- **`i18n-js` interpolação:** usar sintaxe `%{nome}` (não `{{nome}}`) — é a sintaxe por omissão da biblioteca `i18n-js` v4.
- **Pluralização simplificada:** `favoritos.itensAdicionados` (`"%{count} itens adicionados"`) não usa as regras de pluralização nativas do `i18n-js` (chaves `_one`/`_other`) — para o MVP, aceitar a forma plural fixa em todas as contagens (incluindo 1), consistente em PT/ES/EN. Documentar como limitação conhecida, não bloqueante.
- **`notificacoes_prefs` e F15:** a estrutura `jsonb` escolhida antecipa que uma futura Edge Function de envio (F15, fora desta spec) lerá `profiles.notificacoes_prefs->>'sugestoes_jantar'` antes de despachar uma notificação — não há nenhum emissor real a ligar ainda.
- **`FEATURES.md`:** a linha do F13 está marcada `DONE` sem implementação nenhuma existir. Como parte da Fase 5 (ou num commit final), corrigir `FEATURES.md:323` para reflectir o estado real após implementação — não antes.
- **Avatar cache:** o query param `?t=timestamp` em `uploadAvatar` é necessário porque o path do ficheiro é fixo (`{user_id}/avatar.jpg`, `upsert: true`) — sem isto, componentes `<Image>` no RN podem continuar a mostrar a foto antiga em cache mesmo após upload bem-sucedido.
- **`config.niveisActividade`/`config.objectivosNutricionais`:** confirmar os `value` exactos em `packages/config/src/macros.ts` durante a Fase 3 antes de fixar as chaves de tradução — os nomes usados em `pt.ts` nesta spec são inferidos, não confirmados carácter-a-carácter.

## Referências
- Research: `thoughts/shared/research/2026-07-30-perfil-e-configuracoes.md`
- Ticket original: `thoughts/shared/tickets/2026-07-30-perfil-e-configuracoes.md`
- Padrão de multi-select de filtros: `apps/mobile/app/onboarding/step3.tsx`
- Padrão de Edge Function: `supabase/functions/revenuecat-webhook/index.ts`
- Padrão de confirmação destrutiva: `apps/mobile/src/components/pantry/PantryItemCard.tsx:18`
