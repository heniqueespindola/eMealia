# /research — Pesquisa de Codebase (Fase 1 do SDD)

## Objectivo

Antes de implementar qualquer feature, pesquisa o código existente, documenta o que encontras e guarda num ficheiro PRD.md. **Não implementes nada nesta fase.**

---

## Instruções

Quando este comando for invocado com uma feature ou questão, faz o seguinte:

### 1. Analisa o pedido
- Lê a feature ou questão fornecida
- Identifica as áreas da codebase que podem ser afectadas
- Pensa antes de agir — usa `ultrathink` para perceber o âmbito

### 2. Pesquisa em paralelo (usa sub-agentes)
Cria tasks paralelas para investigar:

**a) Código existente relevante**
- Quais ficheiros já existem relacionados com esta feature?
- Há padrões similares já implementados que posso reutilizar?
- Quais hooks, componentes ou utilitários já existem?

**b) Schema da base de dados**
- Que tabelas do Supabase são relevantes?
- Há migrations existentes que preciso de considerar?
- Que Row Level Security policies existem?

**c) Padrões externos (se necessário)**
- Documentação das APIs usadas (YouTube Data API v3, Spoonacular, Edamam, Open Food Facts)
- Exemplos de implementação e code snippets relevantes
- Limites de quota e regras de cache de cada API
- **Nunca reinventes a roda** — se existe uma lib que resolve, usa-a

### 3. Regras críticas desta fase
- ❌ **NÃO** implementes código
- ❌ **NÃO** sugiras refactoring ou optimizações
- ❌ **NÃO** critiques o código existente
- ✅ **APENAS** documenta o que existe, onde está e como funciona
- ✅ **APENAS** recolhe informação necessária para a implementação

### 4. Output — ficheiro PRD.md

Guarda o resultado em `thoughts/shared/research/YYYY-MM-DD-[nome-da-feature].md` com este formato:

```markdown
---
data: [data actual]
feature: "[nome da feature]"
status: completo
---

# Research: [Nome da Feature]

## Questão de Pesquisa
[O que foi pedido para pesquisar]

## Sumário
[Resposta directa em 2-3 frases — o que existe e o que precisas criar]

## Ficheiros Relevantes da Codebase
- `app/(tabs)/feed/index.tsx:45` — [o que faz este ficheiro]
- `lib/youtube.ts:12` — [o que é relevante aqui]
- `hooks/usePantry.ts` — [padrão que podes seguir]

## Padrões de Implementação Existentes
[Code snippets da codebase que mostram o padrão a seguir]

## Tabelas/Queries Supabase Relevantes
[Tabelas afectadas e queries existentes similares]

## APIs Externas Relevantes
[YouTube Data API v3, Spoonacular, Edamam, Open Food Facts — endpoints e limites relevantes]

## Code Snippets de Referência
[Exemplos de implementação que encontraste]

## Questões em Aberto
[O que ainda não está claro e precisa de decisão antes de implementar]
```

### 5. Depois de gerar o PRD.md

Informa o utilizador:
```
✅ Research concluído.
Ficheiro criado: thoughts/shared/research/[nome].md

Próximo passo:
1. Revê o ficheiro gerado
2. Faz /clear para limpar o contexto
3. Usa /plan com o ficheiro para criar a spec
```

---

## Exemplo de uso

```
/research
Como implementar o ecrã de pesquisa de receitas por ingredientes com integração à Spoonacular API?
```

```
/research
Como funciona actualmente o sistema de gestão da despensa (pantry) no projecto?
```

```
/research
Preciso integrar a YouTube Data API v3 para o feed de vídeos. Como está estruturado o código de chamadas externas?
```

```
/research
Como implementar a sincronização da lista de compras com o Apple Reminders via EventKit?
```
