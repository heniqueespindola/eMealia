# eMealia

> **"Da tua despensa à mesa — sem desperdício, sem stress."**

App de descoberta e planeamento de receitas para o mercado ibérico (Portugal e Espanha).  
Disponível em **iOS**, **Android** e **Web**.

---

## Estrutura do projecto

```
eMealia/                          ← raiz do monorepo
├── apps/
│   ├── mobile/                   → Expo 55 · iOS + Android
│   └── web/                      → Next.js 15 · Web
├── packages/
│   ├── types/                    → @emealia/types  (tipos TypeScript partilhados)
│   ├── supabase/                 → @emealia/supabase (queries partilhadas)
│   └── config/                   → @emealia/config  (cores, planos, limites)
├── supabase/
│   ├── schema.sql                → schema + RLS
│   └── functions/                → Edge Functions (Deno)
├── turbo.json
└── package.json
```

---

## Pré-requisitos

| Ferramenta | Versão mínima | Notas |
|---|---|---|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Xcode | 15+ | Só macOS — necessário para iOS |
| Android Studio | Ladybug+ | Necessário para Android |
| Expo CLI | latest | Instalado automaticamente via `npx expo` |

---

## Instalação

```bash
# 1. Clonar o repositório
git clone <url-do-repo>
cd eMealia

# 2. Instalar todas as dependências (raiz + apps + packages)
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as tuas chaves reais do Supabase
```

### Variáveis de ambiente necessárias (`.env`)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# RevenueCat (mobile — subscriptions)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

> As chaves secretas (`YOUTUBE_API_KEY`, `SPOONACULAR_API_KEY`) **nunca** vão para o cliente.  
> Configura-as nas Edge Functions do Supabase: Dashboard → Edge Functions → Secrets.

---

## Correr o projecto

### 🌐 Web

```bash
cd apps/web
npm run dev
```

Abre em: **http://localhost:3000**

> A página inicial (`/`) é a landing page do eMealia.  
> As rotas `/login` e `/register` estão em `app/(auth)/`.

---

### 📱 iOS

> Requer macOS com Xcode instalado.

```bash
# Da raiz do monorepo
npm run mobile

# Ou directamente na pasta mobile
cd apps/mobile
npm run ios
# equivalente a: npx expo start --ios
```

O Simulador iOS abre automaticamente.  
Se não tiveres o Xcode instalado:
```bash
xcode-select --install
```

---

### 🤖 Android

> Requer Android Studio com um AVD (emulador) configurado, ou telemóvel físico via USB.

```bash
# Da raiz do monorepo
npm run mobile

# Ou directamente na pasta mobile
cd apps/mobile
npm run android
# equivalente a: npx expo start --android
```

**Configurar o Android Studio:**
1. Instalar [Android Studio](https://developer.android.com/studio)
2. Abrir **Virtual Device Manager** → criar um AVD (ex: Pixel 8, API 34)
3. Iniciar o emulador antes de correr o comando acima

**Telemóvel físico via USB:**
1. Activar **Modo de Programador** no telemóvel
2. Ligar via USB e aceitar a permissão de depuração
3. Correr `npm run android` — detecta automaticamente o dispositivo

---

### 📷 Expo Go (forma mais rápida — sem emuladores)

Instala a app **Expo Go** no teu telemóvel ([iOS](https://apps.apple.com/app/expo-go/id982107779) · [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) e:

```bash
cd apps/mobile
npx expo start
```

Lê o QR code com a câmara (iOS) ou com a app Expo Go (Android).  
Ideal para desenvolvimento rápido sem configurar emuladores.

---

## Outros comandos úteis

```bash
# Verificar tipos TypeScript em todo o monorepo
npm run typecheck

# Lint
npm run lint

# Build web (produção)
npm run build:web

# Build mobile (produção via EAS)
npm run build:mobile
```

---

## Base de dados (Supabase)

```bash
# Aplicar o schema pela primeira vez
# 1. Ir ao Supabase Dashboard → SQL Editor
# 2. Copiar e executar o conteúdo de supabase/schema.sql
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | Expo 55 + React Native + Expo Router |
| Web | Next.js 15 + App Router |
| Estilos | NativeWind (mobile) · Tailwind CSS (web) |
| Backend | Supabase (Auth + Postgres + Storage + Edge Functions) |
| Estado | Zustand |
| Subscriptions | RevenueCat |
| Monorepo | Turborepo + npm workspaces |
| Linguagem | TypeScript |

---

## Paleta de cores

| Nome | Hex | Uso |
|---|---|---|
| Azul-noite | `#1B2632` | Background principal, headers |
| Azul-noite alt | `#2C3B4D` | Cards, modais |
| Areia | `#C9C1B1` | Bordas, texto secundário |
| Creme | `#EEE9DF` | Background claro |
| Âmbar | `#FFB162` | Cor primária da marca |
| Terracota | `#A35139` | Acento secundário |

---

*Desenvolvido por [mocruz](https://github.com/mocruz) — Henrique Espíndola Cruz*
