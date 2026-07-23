-- eMealia — Schema Supabase (Frankfurt — EU)
-- Executar em: Supabase Dashboard > SQL Editor
-- Versão idempotente: pode ser corrida múltiplas vezes sem erros

-- ─── Profiles (extende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome               text,
  email              text NOT NULL,
  avatar_url         text,
  filtros_dieteticos text[]    DEFAULT '{}',
  plano              text      DEFAULT 'free' CHECK (plano IN ('free','premium_monthly','premium_annual')),
  revenuecat_id      text,
  gdpr_consent       boolean   DEFAULT false,
  gdpr_consent_at    timestamptz,
  frequencia_cozinha int CHECK (frequencia_cozinha BETWEEN 0 AND 7),
  onboarding_completo boolean DEFAULT false,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: só o próprio" ON profiles;
CREATE POLICY "profiles: só o próprio"
  ON profiles FOR ALL USING (auth.uid() = id);

-- Trigger: criar perfil automaticamente após registo
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Pantry Items
CREATE TABLE IF NOT EXISTS pantry_items (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome        text        NOT NULL,
  quantidade  text,
  barcode     text,
  expira_em   date,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry: só o próprio" ON pantry_items;
CREATE POLICY "pantry: só o próprio"
  ON pantry_items FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx ON pantry_items(user_id);

-- ─── Saved Recipes
CREATE TABLE IF NOT EXISTS saved_recipes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id     text        NOT NULL,
  titulo        text        NOT NULL,
  fonte         text        NOT NULL,
  thumbnail_url text,
  source_url    text,
  macros        jsonb,
  filtros       text[]      DEFAULT '{}',
  colecao       text        DEFAULT 'favoritos',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_recipes: só o próprio" ON saved_recipes;
CREATE POLICY "saved_recipes: só o próprio"
  ON saved_recipes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_recipes_user_id_idx ON saved_recipes(user_id);

-- ─── Meal Plan
CREATE TABLE IF NOT EXISTS meal_plan (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  semana_inicio date        NOT NULL,
  dia_semana    int         NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  momento       text        NOT NULL CHECK (momento IN ('pequeno_almoco','almoco','jantar','lanche')),
  recipe_id     text,
  titulo        text,
  fonte         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_plan: só o próprio" ON meal_plan;
CREATE POLICY "meal_plan: só o próprio"
  ON meal_plan FOR ALL USING (auth.uid() = user_id);

-- ─── Shopping List
CREATE TABLE IF NOT EXISTS shopping_list (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome        text        NOT NULL,
  quantidade  text,
  comprado    boolean     DEFAULT false,
  recipe_id   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_list: só o próprio" ON shopping_list;
CREATE POLICY "shopping_list: só o próprio"
  ON shopping_list FOR ALL USING (auth.uid() = user_id);

-- ─── Video Cache (partilhado — sem RLS de utilizador)
CREATE TABLE IF NOT EXISTS video_cache (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_id        text        UNIQUE NOT NULL,
  titulo            text        NOT NULL,
  canal             text        NOT NULL,
  thumbnail_url     text,
  duracao           text,
  views             bigint      DEFAULT 0,
  publicado_em      timestamptz,
  filtros           text[]      DEFAULT '{}',
  ingredientes_chave text[]     DEFAULT '{}',
  cached_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_cache_filtros_idx ON video_cache USING GIN(filtros);
CREATE INDEX IF NOT EXISTS video_cache_views_idx   ON video_cache(views DESC);