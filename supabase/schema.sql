-- eMealia — Schema Supabase (Frankfurt — EU)
-- Executar em: Supabase Dashboard > SQL Editor
-- Versão idempotente: pode ser corrida múltiplas vezes sem erros
-- IMPORTANTE: não há sistema de migrations neste projecto — qualquer
-- alteração a este ficheiro tem de ser colada manualmente no SQL Editor
-- do Supabase Dashboard para ter efeito na base de dados real.

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

ALTER TABLE pantry_items
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'outros'
  CHECK (categoria IN ('frescos','secos','congelados','outros'));

ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

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

ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS tempo_minutos int;
ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_slot_unique'
  ) THEN
    ALTER TABLE meal_plan
      ADD CONSTRAINT meal_plan_slot_unique UNIQUE (user_id, semana_inicio, dia_semana, momento);
  END IF;
END $$;

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

-- ─── F11 — Criadores em Destaque

-- Ligação de vídeos a um criador (a preencher pelo processo externo que
-- popula video_cache — fora deste repo)
ALTER TABLE video_cache
  ADD COLUMN IF NOT EXISTS creator_channel_id text;

CREATE INDEX IF NOT EXISTS video_cache_creator_channel_id_idx
  ON video_cache(creator_channel_id);

-- Criadores parceiros (partilhado — mesmo padrão de video_cache: sem RLS
-- de utilizador, dados públicos geridos por curadoria/admin)
CREATE TABLE IF NOT EXISTS creators (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id     text        UNIQUE NOT NULL,
  nome           text,
  canal          text,
  avatar_url     text,
  especialidade  text,
  numero_videos  int,
  destaque       boolean     NOT NULL DEFAULT true,
  cached_at      timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creators_destaque_idx ON creators(destaque);

-- Subscrições de criadores por utilizador
CREATE TABLE IF NOT EXISTS followed_creators (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id   uuid        REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  followed_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, creator_id)
);

ALTER TABLE followed_creators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followed_creators: só o próprio" ON followed_creators;
CREATE POLICY "followed_creators: só o próprio"
  ON followed_creators FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS followed_creators_user_id_idx ON followed_creators(user_id);
CREATE INDEX IF NOT EXISTS followed_creators_creator_id_idx ON followed_creators(creator_id);

-- Token de push notification (Expo)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text;

-- ─── F13 — Perfil e Configurações: idioma + preferências de notificação
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS idioma text NOT NULL DEFAULT 'pt-PT'
  CHECK (idioma IN ('pt-PT','es-ES','en'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notificacoes_prefs jsonb NOT NULL
  DEFAULT '{"sugestoes_jantar": true, "alertas_despensa": true}'::jsonb;

-- Disparo automático: novo vídeo de um criador seguido -> Edge Function
-- notify-new-video via pg_net. Requer os secrets 'project_url' e
-- 'service_role_key' no Vault do Supabase (criados manualmente no
-- Dashboard/SQL Editor — NUNCA commitar nada disto):
--   select vault.create_secret('https://xxxx.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_creator_followers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_project_url text;
  v_service_key text;
BEGIN
  IF NEW.creator_channel_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  PERFORM net.http_post(
    url     := v_project_url || '/functions/v1/notify-new-video',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
    body    := jsonb_build_object('video_id', NEW.id, 'creator_channel_id', NEW.creator_channel_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_video_cache_insert ON video_cache;
CREATE TRIGGER on_video_cache_insert
  AFTER INSERT ON video_cache
  FOR EACH ROW EXECUTE FUNCTION notify_creator_followers();

-- ─── Modo Offline Básico — updated_at para last-write-wins

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pantry_items_set_updated_at ON pantry_items;
CREATE TRIGGER pantry_items_set_updated_at BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS saved_recipes_set_updated_at ON saved_recipes;
CREATE TRIGGER saved_recipes_set_updated_at BEFORE UPDATE ON saved_recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- ─── F14 — Integração com Apps de Saúde

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_activo boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_ultimo_em timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_saude_plataforma text
  CHECK (sync_saude_plataforma IN ('ios','android'));
