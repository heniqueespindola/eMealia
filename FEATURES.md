# eMealia — Mapa de Features e Prompts do Cowork

> Referência completa de todas as features do MVP e Fase 2,
> com os prompts exactos a usar no Claude Code.
>
> Workflow de cada feature:
> `/new-feature` → `/research` → PRD.md → `/clear` → `/plan` → Spec.md → `/clear` → `/implement` → `/commit`

---

## FASE 1 — MVP

### F01 — Autenticação
**O quê:** Ecrãs de login e registo com Supabase Auth. Email + password.
Redireccionamento automático após login. Protecção de rotas para utilizadores não autenticados.

**Prompt:**
```
/new-feature Autenticação — ecrãs de login e registo com Supabase Auth (email + password),
redireccionamento automático para homepage após login, e protecção de rotas para utilizadores
não autenticados. Usar a paleta do eMealia: fundo #1B2632 (azul-noite), botões #FFB162 (âmbar),
texto branco sobre fundos escuros. Fontes: serif para títulos, sans para corpo.
```

---

### F02 — Onboarding
**O quê:** 3 ecrãs exibidos apenas na primeira abertura.
Passo 1: boas-vindas + preferências dietéticas (vegan, sem glúten, airfryer, etc.).
Passo 2: adicionar os primeiros ingredientes à despensa (mínimo 3 para desbloquear a pesquisa).
Passo 3: seleccionar filtros de receita favoritos e frequência de cozinha.
Guardar em `profiles` no Supabase.

**Prompt:**
```
/new-feature Onboarding — fluxo de 3 ecrãs exibido apenas na primeira abertura da app.
Passo 1: boas-vindas e selecção de preferências dietéticas (multi-select: vegan, vegetariano,
sem glúten, sem lactose, airfryer, rápidas). Passo 2: adicionar primeiros ingredientes à
despensa com sugestões de ingredientes comuns (ovo, massa, tomate, etc.) — pelo menos 3
para continuar. Passo 3: selecção de filtros favoritos e frequência de cozinha semanal.
Guardar tudo na tabela profiles do Supabase. Navegação com botão Próximo e indicador de
progresso (1/3, 2/3, 3/3). Usar âmbar eMealia (#FFB162) como cor de destaque em botões e
indicadores de progresso. Fundo #EEE9DF (pergaminho) para os ecrãs de onboarding.
```

---

### F03 — Homepage com feed de vídeos
**O quê:** Ecrã inicial após login. Feed de vídeos em carrossel horizontal com autoplay
no card central. Vídeos de YouTube, TikTok, Instagram e eMealia Originals. Filtros por
categoria (Todos, Rápidas, Vegan, Airfryer, Sobremesas) em pills horizontais.
Anel de progresso animado no card central mostra tempo restante antes de avançar.

**Prompt:**
```
/new-feature Homepage com feed de vídeos — ecrã inicial da app após autenticação.
Funcionalidades: (1) carrossel horizontal de cards de vídeo em formato portrait (9:16)
onde o card central está em destaque (escala 1.0, borda #FFB162 âmbar) e os adjacentes
estão em escala reduzida (0.82) e com overlay escuro, (2) autoplay automático no card
central após 4 segundos com anel de progresso SVG animado, (3) ao clicar num card lateral
move o carrossel para esse card, (4) filtros de categoria em pills horizontais (Todos,
Rápidas, Vegan, Airfryer, Sobremesas) que filtram os cards visíveis e reiniciam o autoplay,
(5) badges de fonte em cada card (YouTube #FF0000, TikTok #010101, Instagram #C13584, eMealia #FFB162),
(6) dots de navegação na base e setas de prev/next. Header com fundo #1B2632 (azul-noite) e
logo eMealia. Pills de filtro com fundo #2C3B4D inactivo e #FFB162 activo.
Dados mock inicialmente, depois ligar à tabela video_cache do Supabase.
Personalizar feed pelos filtros_dieteticos do perfil.
```

---

### F04 — Pesquisa por ingredientes
**O quê:** Ecrã de pesquisa onde o utilizador escreve ingredientes e recebe receitas
de blogs e YouTube. Integração com Spoonacular API via Edge Function do Supabase.
Filtros dietéticos. Resultados mostram thumbnail, tempo, calorias e tags.

**Prompt:**
```
/new-feature Pesquisa por ingredientes — ecrã central da app. O utilizador escreve ou
selecciona ingredientes (com sugestões autocomplete) e recebe receitas que pode fazer.
Funcionalidades: (1) input de ingredientes com chips removíveis (ex: "ovo" × "tomate" ×),
(2) opção "usar despensa" que pré-preenche com ingredientes da pantry_items do utilizador,
(3) filtros dietéticos em pills (Vegan, Rápida, Airfryer, etc.) aplicados em tempo real,
(4) resultados da Spoonacular API (via Edge Function Supabase — nunca expor API key no cliente)
com thumbnail, título, tempo de preparação, calorias e filtros identificados,
(5) indicador visual de ingredientes em falta vs. disponíveis na despensa,
(6) botão de guardar em favoritos em cada resultado,
(7) cache de resultados no Redis (1h máximo — obrigatório por termos Spoonacular).
```

---

### F05 — Despensa / inventário de ingredientes
**O quê:** Gestão dos ingredientes que o utilizador tem em casa. CRUD completo.
Adicionar por texto, por voz ou por scanning de código de barras (Open Food Facts).
A despensa alimenta automaticamente a pesquisa por ingredientes.

**Prompt:**
```
/new-feature Despensa — inventário de ingredientes do utilizador. Funcionalidades:
(1) lista de ingredientes agrupada por categoria (frescos, secos, congelados, outros)
com pull-to-refresh, (2) adicionar ingrediente por texto com autocomplete de nomes comuns,
(3) scanner de código de barras usando expo-camera que consulta Open Food Facts API
(gratuita, pode ser chamada directamente do cliente) para identificar o produto,
(4) editar quantidade e data de validade de cada item, (5) eliminar com swipe ou toque longo,
(6) botão "cozinhar agora" que abre a pesquisa pré-preenchida com os ingredientes da despensa,
(7) alerta visual para ingredientes perto do prazo de validade (3 dias ou menos).
CRUD completo com tabela pantry_items do Supabase com RLS.
Limite: 20 itens no plano Grátis, ilimitado no Premium.
```

---

### F06 — Favoritos e coleções
**O quê:** Guardar receitas de qualquer fonte (Spoonacular, YouTube, TikTok, Instagram,
eMealia Originals). Organizar em coleções personalizadas. Ver macros e tempo de preparação.

**Prompt:**
```
/new-feature Favoritos e coleções — ecrã para guardar e organizar receitas preferidas.
Funcionalidades: (1) lista de receitas guardadas com thumbnail, título, fonte (badge colorido),
tempo e calorias, (2) organizar em coleções com nome personalizado (default: "Favoritos",
"Para experimentar", "Semana"), (3) criar e eliminar coleções, (4) mover receitas entre coleções
com long-press, (5) filtrar favoritos por filtro dietético ou fonte, (6) visualizar macros
completos (proteínas, hidratos, gorduras, calorias) de cada receita guardada,
(7) botão de acesso rápido para abrir a receita original (YouTube embed ou URL externa).
CRUD completo com tabela saved_recipes do Supabase.
Limite: 10 receitas no plano Grátis, ilimitado no Premium.
```

---

### F07 — Lista de compras automática
**O quê:** A partir de uma receita seleccionada, gera automaticamente a lista dos ingredientes
em falta (comparando com a despensa). Exporta para Apple Reminders (iOS) ou Google Tasks (Android).
Gestão manual da lista também disponível.

**Prompt:**
```
/new-feature Lista de compras automática — ecrã de gestão da lista de compras.
Funcionalidades: (1) gerar lista automaticamente a partir de uma receita: compara ingredientes
da receita com pantry_items do utilizador e lista apenas os ingredientes em falta,
(2) gerar lista consolidada a partir do plano semanal (todos os ingredientes em falta da semana),
(3) adicionar itens manualmente com autocomplete, (4) marcar itens como comprado (checkbox),
(5) eliminar itens individualmente ou limpar a lista completa, (6) exportar lista para
Apple Reminders via EventKit (iOS) ou Google Tasks API (Android) — integração nativa via
expo-calendar ou módulo nativo, (7) partilhar lista como texto via share sheet do sistema.
CRUD completo com tabela shopping_list do Supabase.
Exportação para Reminders/Tasks disponível apenas no plano Premium.
```

---

### F08 — Planos e pagamentos
**O quê:** Ecrã de upgrade de plano. Mostrar diferenças entre Grátis, Premium Mensal (€4,99)
e Premium Anual (€34,99). Integração com RevenueCat para in-app purchases iOS e Android.
Bloquear features premium com CTA de upgrade contextual.

**Prompt:**
```
/new-feature Planos e pagamentos — ecrã de upgrade com apresentação dos 3 planos eMealia:
Grátis (€0), Premium Mensal (€4,99/mês) e Premium Anual (€34,99/ano — destaque "Melhor valor").
Integração com RevenueCat para in-app purchases iOS (StoreKit) e Android (Google Play Billing).
Funcionalidades: (1) ecrã de comparação de planos com tabela de features, (2) bloquear
funcionalidades premium (planeamento semanal, macros, export Reminders, despensa ilimitada,
favoritos ilimitados) com lock icon e CTA de upgrade contextual ao tentar usar a feature,
(3) restaurar compras anteriores, (4) confirmar plano activo no perfil do utilizador,
(5) actualizar coluna plano em profiles após compra confirmada via RevenueCat webhook.
Referência de preços: Samsung Food+ $6,99/mês; posicionar eMealia como alternativa europeia
mais acessível.
```

---

## FASE 2 — Pós-MVP

### F09 — Planeamento semanal de refeições
**O quê:** Calendário semanal onde o utilizador arrasta receitas para cada refeição do dia
(pequeno-almoço, almoço, jantar, lanche). Gera lista de compras consolidada para a semana.
Mostra totais de macros por dia. Disponível apenas no plano Premium.

**Prompt:**
```
/new-feature Planeamento semanal — disponível apenas no plano Premium. Interface de calendário
para a semana actual com drag-and-drop de receitas. Funcionalidades: (1) vista semanal com
colunas por dia (Segunda a Domingo) e linhas por momento (pequeno-almoço, almoço, jantar, lanche),
(2) adicionar receita a um slot via pesquisa ou a partir dos favoritos, (3) remover ou trocar
receita de um slot com swipe, (4) barra de macros diários (calorias, proteínas, hidratos, gorduras)
calculada automaticamente a partir das receitas planeadas, (5) botão "gerar lista de compras"
que consolida todos os ingredientes em falta para a semana, (6) persistência do plano na tabela
meal_plan do Supabase. Usar tabela meal_plan com colunas semana_inicio, dia_semana, momento.
```

---

### F10 — Contagem de macros avançada
**O quê:** Dashboard de nutrição com totais diários e semanais. Objectivos personalizados
(perda de peso, ganho muscular, manutenção). Gráficos de progresso. Integração com
o planeamento semanal. Disponível apenas no plano Premium.

**Prompt:**
```
/new-feature Contagem de macros avançada — disponível apenas no plano Premium. Dashboard de
nutrição com: (1) objectivos diários personalizáveis (calorias, proteínas, hidratos, gorduras)
baseados em peso, altura, actividade e objectivo (perda, manutenção, ganho), (2) totais diários
calculados automaticamente a partir das receitas planeadas no meal_plan, (3) gráfico de barras
com progresso em relação ao objectivo por macro, (4) histórico semanal e mensal,
(5) alerta quando um plano semanal excede consistentemente os objectivos calóricos.
Dados de macros provenientes da Spoonacular API (já guardados em saved_recipes.macros).
```

---

### F11 — Criadores em destaque
**O quê:** Secção dedicada a criadores de conteúdo culinário curados pela eMealia.
Perfis de criadores com os seus vídeos mais populares. Sistema de seguir criador.
Notificação quando um criador seguido publica novo conteúdo.

**Prompt:**
```
/new-feature Criadores em destaque — secção de descoberta de criadores culinários curados.
Funcionalidades: (1) lista de criadores parceiros com avatar, nome, canal, número de receitas
e especialidade (ex: "Cozinha vegana rápida"), (2) perfil de criador com os seus vídeos mais
recentes/populares do video_cache, (3) botão seguir/deixar de seguir criador,
(4) tab "A seguir" na homepage que filtra o feed apenas para criadores seguidos,
(5) notificação push quando um criador seguido tem novo vídeo no cache.
Tabela nova: followed_creators (user_id, creator_channel_id, followed_at).
```

---

### F12 — Modo offline básico
**O quê:** As últimas 20 receitas vistas e os favoritos ficam disponíveis sem ligação.
A despensa é editável offline e sincroniza quando voltar a ligar. Indica claramente
quando a app está em modo offline.

**Prompt:**
```
/new-feature Modo offline básico — permitir usar a app sem ligação à internet para
funcionalidades essenciais. Funcionalidades: (1) cache local das últimas 20 receitas
visualizadas usando expo-sqlite ou AsyncStorage, (2) despensa editável offline com
sync ao voltar a ligar (conflict resolution: last-write-wins), (3) favoritos disponíveis
offline com dados cached, (4) banner de aviso "Modo offline — algumas funcionalidades
podem não estar disponíveis" quando sem ligação detectada via NetInfo,
(5) fila de operações pendentes (adicionar/remover da despensa) sincronizadas ao reconectar.
```

---

### F13 — Perfil e configurações
**O quê:** Ecrã completo de perfil com foto, nome. Configurações de preferências dietéticas,
filtros favoritos, idioma (PT/ES), notificações. Gestão do plano Premium e eliminação de conta
(obrigatório GDPR).

**Prompt:**
```
/new-feature Perfil e configurações — ecrã completo de gestão de conta e preferências.
Secções: (1) perfil — foto de perfil (upload via expo-image-picker para Supabase Storage),
nome de utilizador, email, (2) preferências — filtros dietéticos (multi-select editável),
idioma da app (Português / Español), notificações push (on/off por tipo),
(3) plano — plano actual, data de renovação, botão de upgrade ou gerir subscrição via RevenueCat,
(4) privacidade — exportar todos os dados pessoais (GDPR Art. 20), eliminar conta com confirmação
destrutiva (GDPR Art. 17) que remove todos os dados do Supabase, (5) logout com confirmação.
Sincronizar todas as alterações com tabela profiles do Supabase em tempo real.
```

---

### F14 — Integração com apps de saúde
**O quê:** Exportar dados de macros e calorias para Apple Health (iOS) e Google Fit (Android).
O utilizador autoriza a partilha e os dados do plano semanal são sincronizados automaticamente.

**Prompt:**
```
/new-feature Integração com apps de saúde — disponível apenas no plano Premium. Sincronizar
dados nutricionais com plataformas de saúde do sistema operativo. Funcionalidades:
(1) autorização para Apple Health (HealthKit) via expo-health ou módulo nativo no iOS,
(2) autorização para Google Fit via Google Fit REST API no Android,
(3) exportar calorias e macros (proteínas, hidratos, gorduras) de cada refeição planeada,
(4) ecrã de configuração de sincronização com toggle on/off e data do último sync,
(5) sync automático diário quando o plano semanal tem refeições registadas.
Disponível apenas no plano Premium.
```

---

### F15 — Notificações inteligentes
**O quê:** Notificação diária às 18h00 com sugestão de jantar baseada nos ingredientes da
despensa. Alerta quando ingredientes estão perto do prazo de validade. Lembrete semanal
para planear as refeições. Usa Expo Push Notifications.

**Prompt:**
```
/new-feature Notificações inteligentes — sistema de notificações push personalizadas.
Tipos: (1) sugestão de jantar diária às 18h00 com receita baseada nos ingredientes da despensa
do utilizador (consulta pantry_items e sugere via Spoonacular API numa Edge Function agendada),
(2) alerta de validade quando um ingrediente da despensa expira em 3 dias ou menos,
(3) lembrete semanal às segundas-feiras para planear as refeições da semana (apenas Premium),
(4) novidades de criadores seguidos.
Implementar com Expo Push Notifications + token registado em profiles.
Agendamento via GitHub Actions ou Supabase pg_cron para as Edge Functions diárias.
Incluir pedido de permissão no onboarding (Passo 3).
```

---

## REFERÊNCIA RÁPIDA — Ordem de desenvolvimento

| # | Feature | Fase | Plano mínimo |
|---|---|---|---|
| F01 | Autenticação | MVP | Todos |
| F02 | Onboarding | MVP | Todos |
| F03 | Homepage + feed de vídeos | MVP | Todos |
| F04 | Pesquisa por ingredientes | MVP | Todos |
| F05 | Despensa / inventário | MVP | Todos (limite grátis) |
| F06 | Favoritos e coleções | MVP | Todos (limite grátis) |
| F07 | Lista de compras automática | MVP | Grátis (export = Premium) |
| F08 | Planos e pagamentos | MVP | — |
| F09 | Planeamento semanal | Fase 2 | Premium |
| F10 | Macros avançados | Fase 2 | Premium |
| F11 | Criadores em destaque | Fase 2 | Todos |
| F12 | Modo offline básico | Fase 2 | Todos |
| F13 | Perfil e configurações | Fase 2 | Todos |
| F14 | Integração Apple Health / Google Fit | Fase 2 | Premium |
| F15 | Notificações inteligentes | Fase 2 | Todos (algumas Premium) |

---

*Documento criado em Junho 2026 — mocruz / eMealia*
*Paleta de referência: #1B2632 · #2C3B4D · #C9C1B1 · #EEE9DF · #FFB162 · #A35139*
