# eMealia — Contexto do Projecto para Claude Code

## O que é este projecto

**eMealia** é uma app mobile de descoberta e planeamento de receitas para utilizadores europeus (foco inicial em Portugal e Espanha).
Agrega receitas de blogs, YouTube, TikTok e Instagram numa experiência unificada, com pesquisa por ingredientes disponíveis em casa, gestão de despensa, planeamento semanal de refeições e contagem de macros.

**Proposta de valor:** "Cozinha o que tens. Descobre o que queres."
**Tagline PT:** "Da tua despensa à mesa — sem desperdício, sem stress."

**Empresa:** mocruz (Henrique — founder solo, bootstrapped)
**Mercado primário:** Portugal + Espanha (Europa Ocidental lusófona e ibérica)
**Expansão:** França, Itália, restante Europa Ocidental

---

## Brand e identidade visual

**Nome:** eMealia (jogo com "meal" + sufixo ibérico/digital)

**Logo:** Ícone circular tipo carimbo de mercado + wordmark "eMealia"
- Formato principal: ícone à esquerda + "eMealia" à direita (serif "e" + sans "Mealia")
- Ícone standalone: carimbo circular (para ícone de app, favicon)
- Cor primária da marca: #FFB162 (âmbar quente)
- Ficheiros em: `src/assets/images/`

**Paleta de cores (exacta):**
```
/* — Backgrounds e estrutura — */
#1B2632  Azul-noite (background principal escuro — headers, splash, nav bar)
#2C3B4D  Azul-ardósia (superfícies secundárias escuras — cards, drawers)

/* — Neutros quentes — */
#C9C1B1  Areia escura (bordas, separadores, placeholders)
#EEE9DF  Pergaminho (background claro principal — ecrãs light mode)

/* — Accent — */
#FFB162  Âmbar (primary — botões, CTAs, ícone da marca, destaques)
#A35139  Terracota (primary dark — hover, pressed, texto sobre âmbar claro)

/* — Base — */
#000000  Preto (texto principal em fundos claros)
#FFFFFF  Branco (texto em fundos escuros, ícones sobre âmbar)

/* — Fontes de vídeo (badges) — */
#FF0000  Vermelho YouTube
#010101  Preto TikTok
#C13584  Roxo Instagram
```
→ Definida em `src/constants/theme.ts`

**Tokens de cor para o theme.ts:**
```typescript
export const colors = {
  // Backgrounds
  bgDark:       '#1B2632',
  bgDarkAlt:    '#2C3B4D',
  // Neutros
  border:       '#C9C1B1',
  bgLight:      '#EEE9DF',
  // Accent
  primary:      '#FFB162',
  primaryDark:  '#A35139',
  // Base
  black:        '#000000',
  white:        '#FFFFFF',
  // Texto
  textPrimary:  '#000000',   // em fundos claros
  textInverted: '#FFFFFF',   // em fundos escuros / sobre primary
  textMuted:    '#C9C1B1',   // labels secundários
  // Fontes de vídeo
  youtube:      '#FF0000',
  tiktok:       '#010101',
  instagram:    '#C13584',
  emealia:      '#FFB162',
};
```

**Tipografia:**
| Token | Uso |
|---|---|
| `fonts.display` | Títulos, headings principais |
| `fonts.regular` | Corpo de texto, descrições |
| `fonts.medium` | Labels, subtítulos |
| `fonts.semibold` | Botões, destaques |
| `fonts.bold` | Headings secundários, métricas |

**Tom de comunicação:**
- Prático e encorajador, nunca frio ou corporativo
- Foco em simplicidade: "o que tens em casa → o que podes cozinhar"
- Respeita a vida real do utilizador: sem tempo, com orçamento limitado
- "Culinária" aqui = cozinha do dia-a-dia, não gastronomia de revista
- Português europeu (pt-PT) como idioma principal; espanhol (es-ES) como segundo

---

## Stack tecnológica

**Plataformas de distribuição: iOS (App Store) + Android (Google Play)**
O projecto gera builds nativos para ambas as plataformas a partir de uma única codebase React Native. Usar EAS Build (Expo Application Services) para compilar e distribuir.

| Camada | Tecnologia | Porquê |
|---|---|---|
| Mobile | React Native + Expo 55 | iOS + Android numa codebase, OTA updates, EAS Build |
| Build | EAS Build (Expo) | Builds iOS (.ipa) e Android (.aab) na cloud sem Xcode/Android Studio local |
| Backend | Supabase (EU — Frankfurt) | Auth + DB + Edge Functions, GDPR-compliant |
| Receitas | Spoonacular API | 365k+ receitas, pesquisa por ingredientes, macros |
| Vídeos | YouTube Data API v3 | Feed de receitas em vídeo, gratuito até 10k unidades/dia |
| Produtos | Open Food Facts | Scanning de código de barras, base de dados open source |
| Subscrições | RevenueCat | Gestão de in-app purchases iOS (StoreKit 2) + Android (Google Play Billing) |
| Cache | Redis (Railway) | Cache de respostas Spoonacular (obrigatório — max 1h) |
| Estado global | Zustand | Estado simples e performante |
| SVG | react-native-svg + react-native-svg-transformer | Logos e ícones escaláveis |
| Notificações | Expo Push Notifications | Sugestões de jantar + alertas de despensa |

**Versões:** Expo 55, React 19.2.0, React Native 0.83.2
**Nota:** Usar sempre `npm install` (não `npx expo install`) — o `.npmrc` tem `legacy-peer-deps=true`

**Configuração EAS Build:**
```json
// eas.json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "buildType": "release" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Comandos de build:**
```bash
# Build de produção iOS (.ipa → App Store)
eas build --platform ios --profile production

# Build de produção Android (.aab → Google Play)
eas build --platform android --profile production

# Build de desenvolvimento (ambas as plataformas)
eas build --platform all --profile development

# Submit directo às stores
eas submit --platform ios
eas submit --platform android
```

**Regras críticas de API:**
- `YOUTUBE_API_KEY` — nunca no cliente; apenas em Edge Functions do Supabase
- `SPOONACULAR_API_KEY` — nunca no cliente; apenas em Edge Functions do Supabase
- Cache Spoonacular obrigatório: máximo 1 hora por termos de uso
- YouTube search.list custa 100 unidades/chamada — usar com cache Redis
- Open Food Facts é gratuito e open source — pode ser chamado directamente do cliente

---

## Estrutura de pastas do projecto

```
eMealia/
├── .claude/commands/           # Comandos do cowork (não editar)
├── .agents/skills/             # Skills dos agentes (não editar)
├── .env                        # Variáveis de ambiente (não commitar)
├── .npmrc                      # legacy-peer-deps=true
├── metro.config.js             # SVG transformer configurado
├── tsconfig.json               # Path alias @/ → src/
│
├── app/                        # Expo Router — ecrãs e navegação
│   ├── _layout.tsx             # Root layout (fontes carregadas aqui)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Homepage — feed de vídeos curado
│   │   ├── search.tsx          # Pesquisa por ingredientes
│   │   ├── pantry.tsx          # Despensa — inventário de ingredientes
│   │   ├── planner.tsx         # Planeamento semanal (Premium)
│   │   └── profile.tsx         # Perfil e configurações
│   └── onboarding/
│       ├── step1.tsx           # Boas-vindas + preferências dietéticas
│       ├── step2.tsx           # Adicionar primeiros ingredientes à despensa
│       └── step3.tsx           # Seleccionar filtros favoritos
│
├── assets/                     # Assets do sistema Expo (PNG obrigatório)
│   ├── icon.png
│   ├── icon-dark.png
│   ├── splash-icon.png
│   └── favicon.png
│
└── src/                        # Código e assets internos
    ├── assets/
    │   ├── fonts/              # Fontes TTF (carregadas em app/_layout.tsx)
    │   └── images/             # SVGs do brand
    ├── components/
    │   ├── ui/                 # Button, Input, Card, Badge, Pill
    │   ├── feed/               # VideoCard, CarouselStrip, SourceBadge
    │   ├── recipe/             # RecipeCard, MacroBar, FilterRow
    │   └── pantry/             # IngredientItem, BarcodeScanner
    ├── constants/
    │   └── theme.ts            # Paleta, fontes, spacing, radius
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useFeed.ts          # Feed de vídeos YouTube
    │   ├── useRecipeSearch.ts  # Pesquisa Spoonacular por ingredientes
    │   ├── usePantry.ts        # Gestão da despensa
    │   ├── usePlanner.ts       # Planeamento semanal
    │   └── useMacros.ts        # Contagem de macros
    ├── lib/
    │   ├── supabase.ts         # Cliente Supabase (configurado)
    │   ├── youtube.ts          # Cliente YouTube Data API v3
    │   ├── spoonacular.ts      # Cliente Spoonacular API
    │   └── revenuecat.ts       # Subscrições in-app
    ├── stores/                 # Estado global (Zustand)
    └── types/
        ├── declarations.d.ts   # Tipagem SVG + types globais
        ├── recipe.ts           # Recipe, Ingredient, MacroNutrients
        ├── feed.ts             # VideoItem, VideoSource, CreatorInfo
        └── pantry.ts           # PantryItem, ShoppingListItem
```

**Path alias:** usar `@/` em vez de caminhos relativos
```typescript
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { VideoCard } from '@/components/feed/VideoCard';
```

---

## Schema da base de dados (Supabase)

```sql
-- Perfis de utilizador (extende auth.users)
profiles (
  id uuid PRIMARY KEY references auth.users,
  nome text,
  email text,
  avatar_url text,
  filtros_dieteticos text[] DEFAULT '{}', -- ['vegan','gluten_free','airfryer',...]
  plano text DEFAULT 'free',              -- free | premium_monthly | premium_annual
  revenuecat_id text,
  gdpr_consent boolean DEFAULT false,
  gdpr_consent_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Inventário da despensa do utilizador
pantry_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade text,                        -- "500g", "2 unidades", etc.
  barcode text,                           -- Open Food Facts barcode
  expira_em date,
  created_at timestamptz DEFAULT now()
)

-- Receitas guardadas / favoritas
saved_recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id text NOT NULL,               -- ID Spoonacular ou URL YouTube
  titulo text NOT NULL,
  fonte text NOT NULL,                   -- 'spoonacular' | 'youtube' | 'tiktok' | 'instagram' | 'emealia'
  thumbnail_url text,
  source_url text,
  macros jsonb,                          -- {calorias, proteinas, hidratos, gorduras}
  filtros text[],
  colecao text DEFAULT 'favoritos',
  created_at timestamptz DEFAULT now()
)

-- Planeamento semanal de refeições
meal_plan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  semana_inicio date NOT NULL,           -- Segunda-feira da semana
  dia_semana int NOT NULL,               -- 0=Segunda, 6=Domingo
  momento text NOT NULL,                 -- 'pequeno_almoco' | 'almoco' | 'jantar' | 'lanche'
  recipe_id text,
  titulo text,
  fonte text,
  created_at timestamptz DEFAULT now()
)

-- Lista de compras gerada automaticamente
shopping_list (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade text,
  comprado boolean DEFAULT false,
  recipe_id text,                        -- receita de origem (opcional)
  created_at timestamptz DEFAULT now()
)

-- Cache de vídeos curados (actualizado periodicamente)
video_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id text UNIQUE NOT NULL,
  titulo text NOT NULL,
  canal text NOT NULL,
  thumbnail_url text,
  duracao text,
  views bigint,
  publicado_em timestamptz,
  filtros text[],                        -- ['vegan','airfryer','rapida',...]
  ingredientes_chave text[],
  cached_at timestamptz DEFAULT now()
)
```

**RLS:** todas as tabelas com Row Level Security. Utilizador só acede aos seus próprios dados.

---

## Tipos principais

```typescript
type VideoSource = 'youtube' | 'tiktok' | 'instagram' | 'emealia';

type FiltroDietetico =
  | 'vegan'
  | 'vegetariano'
  | 'sem_gluten'
  | 'sem_lactose'
  | 'airfryer'
  | 'rapida'          // < 30 minutos
  | 'fria'            // sem cozedura
  | 'sobremesa'
  | 'pequeno_almoco'

type Momento =
  | 'pequeno_almoco'
  | 'almoco'
  | 'jantar'
  | 'lanche'

interface MacroNutrients {
  calorias: number;
  proteinas: number;  // gramas
  hidratos: number;   // gramas
  gorduras: number;   // gramas
}

interface VideoItem {
  id: string;
  youtubeId?: string;
  titulo: string;
  canal: string;
  fonte: VideoSource;
  thumbnailUrl: string;
  duracao: string;
  views: number;
  filtros: FiltroDietetico[];
}

interface Recipe {
  id: string;
  titulo: string;
  fonte: VideoSource | 'spoonacular' | 'blog';
  thumbnailUrl: string;
  tempoMinutos: number;
  macros: MacroNutrients;
  filtros: FiltroDietetico[];
  ingredientes: string[];
}
```

---

## Planos e preços

| Plano | Preço | Features |
|---|---|---|
| **Grátis** | €0 | Pesquisa por ingredientes, feed vídeos (5/dia), despensa (20 items), favoritos (10) |
| **Premium Mensal** | €4,99/mês | Tudo ilimitado + planeamento semanal + macros + sync Reminders |
| **Premium Anual** | €34,99/ano (~€2,92/mês) | Tudo do mensal + acesso antecipado a novas features |

---

## Regras de desenvolvimento

1. **TypeScript obrigatório** — sem `any`, sem `@ts-ignore`
2. **Componentes pequenos** — máximo 150 linhas por ficheiro
3. **Separação de responsabilidades** — lógica de negócio fora dos componentes UI
4. **Supabase RLS sempre** — nunca fazer bypass de Row Level Security
5. **Nunca hardcodar** chaves de API — usar variáveis de ambiente
6. **YOUTUBE_API_KEY e SPOONACULAR_API_KEY nunca no cliente** — apenas em Edge Functions do Supabase
7. **Cache obrigatório** — todas as respostas Spoonacular cached até 1h; YouTube cached até 4h
8. **Antes de commit:** correr `tsc --noEmit`
9. **Commits em português europeu** — mensagens claras em pt-PT
10. **Path alias `@/`** — nunca usar `../../` para imports internos
11. **GDPR** — dados de utilizadores apenas em servidores EU (Supabase Frankfurt)
12. **Direito ao esquecimento** — fluxo de eliminação de conta obrigatório (GDPR Art. 17)

**Padrão de commit:**
```
feat: adiciona pesquisa de receitas por ingredientes
fix: corrige offset do carrossel no iOS
chore: actualiza dependência spoonacular-js
refactor: extrai lógica de filtros para src/utils/filters.ts
docs: documenta hook useRecipeSearch
```

---

## Variáveis de ambiente (`.env`)

```bash
# Cliente — visíveis na app (prefixo EXPO_PUBLIC_)
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx

# Servidor — NUNCA no cliente (usar em Edge Functions do Supabase)
# YOUTUBE_API_KEY=AIzaSyxxx
# SPOONACULAR_API_KEY=xxx
# REDIS_URL=redis://xxx (Railway)
```

---

## Fase actual de desenvolvimento

**MVP — Fase 1** (a iniciar)

**Estado do setup:**
- [ ] Projecto Expo criado (`npx create-expo-app eMealia`)
- [ ] `.npmrc` com `legacy-peer-deps=true`
- [ ] `metro.config.js` com SVG transformer
- [ ] `tsconfig.json` com path alias `@/`
- [ ] `eas.json` configurado (development / preview / production)
- [ ] `app.json` com `bundleIdentifier` iOS e `package` Android definidos
- [ ] Estrutura de pastas `src/` criada
- [ ] `src/constants/theme.ts` com paleta eMealia (cores da imagem de referência)
- [ ] `src/lib/supabase.ts` configurado (região EU Frankfurt)
- [ ] `src/types/` com tipos base (recipe, feed, pantry)
- [ ] `app/_layout.tsx` com fontes carregadas
- [ ] `supabase/schema.sql` criado e executado no Supabase
- [ ] `.env` preenchido com valores reais
- [ ] EAS CLI instalado: `npm install -g eas-cli && eas login`

**Dependências a instalar:**
- `@supabase/supabase-js` + `expo-secure-store` + `expo-crypto`
- `expo-router` + `expo-linking` + `expo-constants`
- `expo-font` + `expo-notifications` + `expo-device`
- `expo-camera` (barcode scanner) + `expo-image-picker`
- `react-native-svg` + `react-native-svg-transformer`
- `react-native-gesture-handler` + `react-native-reanimated@3.x`
- `react-native-safe-area-context` + `react-native-screens`
- `zustand`
- `react-native-purchases` (RevenueCat)
- `nativewind` + `tailwindcss`

**⚠️ Notas de versão importantes (herdadas do Manna):**
- `react-native-reanimated` deve ser sempre a versão `3.x` — nunca instalar sem fixar versão.
  A versão `4.x` requer `react-native-worklets`, incompatível com Expo 55.
  Nunca fazer `npx expo install react-native-reanimated` sem fixar: `npm install react-native-reanimated@3.16.7`
- Usar sempre `npm install` (não `npx expo install`) — o `.npmrc` tem `legacy-peer-deps=true`
- EAS Build requer conta Expo com `eas-cli` instalado globalmente: `npm install -g eas-cli`
- Para build iOS em produção, requer Apple Developer Account activa (€99/ano)
- Para build Android em produção, requer Google Play Console activa (taxa única $25)

**Features MVP a implementar:**
- [ ] F01 — Autenticação (login, registo, protecção de rotas)
- [ ] F02 — Onboarding (3 ecrãs, preferências dietéticas, primeiros ingredientes)
- [ ] F03 — Homepage com feed de vídeos (carrossel horizontal, autoplay central)
- [ ] F04 — Pesquisa por ingredientes (Spoonacular + filtros dietéticos)
- [ ] F05 — Despensa / inventário de ingredientes (CRUD + barcode scanner)
- [ ] F06 — Favoritos e coleções (guardar receitas de qualquer fonte)
- [ ] F07 — Lista de compras automática (a partir de receita, export Reminders/Tasks)
- [ ] F08 — Planos e pagamentos (RevenueCat, Premium Mensal + Anual)

---

## Workflow de desenvolvimento (Claude Code)

```
/new-feature → /research → PRD.md → /clear → /plan → Spec.md → /clear → /implement → /commit
```

**Regra crítica:** nunca exceder 50% da context window numa fase. Usar `/clear` entre fases.

### Comandos disponíveis
- `/new-feature` — iniciar nova feature
- `/research` — investigar e gerar PRD.md
- `/plan` — gerar Spec.md
- `/implement` — implementar conforme Spec.md
- `/commit` — commit semântico
- `/resume` — retomar contexto
- `/handoff` — preparar handoff para nova sessão

---

## Recursos de referência

- Schema da base de dados: `supabase/schema.sql`
- Documentação YouTube API: https://developers.google.com/youtube/v3
- Documentação Spoonacular: https://spoonacular.com/food-api/docs
- Open Food Facts API: https://world.openfoodfacts.org/data
- RevenueCat docs: https://docs.revenuecat.com
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

## Atualização da arquitectura — Monorepo (Junho 2026)

O projecto foi convertido para **monorepo** para suportar iOS + Android + **Web**.

```
eMealia/                          ← raiz do monorepo
├── apps/
│   ├── mobile/                   → Expo 55 (iOS + Android)
│   │   ├── app/                  → Expo Router (ecrãs)
│   │   └── src/                  → componentes, hooks, stores, lib
│   └── web/                      → Next.js 15 (web)
│       ├── app/                  → App Router Next.js
│       ├── components/           → componentes React
│       └── lib/supabase/         → cliente server + browser
├── packages/
│   ├── types/                    → tipos TypeScript partilhados (@emealia/types)
│   ├── supabase/                 → queries partilhadas (@emealia/supabase)
│   └── config/                   → cores, planos, limites (@emealia/config)
├── supabase/
│   ├── schema.sql                → schema completo + RLS
│   └── functions/                → Edge Functions (YouTube + Spoonacular)
├── turbo.json                    → Turborepo
└── package.json                  → workspaces npm
```

**Comandos de desenvolvimento:**
```bash
# Instalar tudo (raiz)
npm install

# Mobile
npm run mobile          # ou: cd apps/mobile && npx expo start

# Web
npm run web              # ou: cd apps/web && npm run dev

# Typecheck global
npm run typecheck
```

**Imports partilhados:**
```typescript
import type { Recipe, PantryItem, VideoItem } from '@emealia/types';
import { getFeed, savePantryItem }            from '@emealia/supabase';
import { colors, PLANS, FILTROS_DIETETICOS }  from '@emealia/config';
```

**Regra:** lógica de negócio e queries → `packages/`. UI e ecrãs → `apps/`.
