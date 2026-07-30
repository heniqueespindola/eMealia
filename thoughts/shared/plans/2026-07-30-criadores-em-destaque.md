---
data: 2026-07-30
feature: "Criadores em Destaque"
research: "thoughts/shared/research/2026-07-30-criadores-em-destaque.md"
status: aguarda_implementacao
---

# Spec: Criadores em Destaque

## Visão Geral
Introduz criadores parceiros como entidade própria (`creators`, dados via YouTube Data API), permite segui-los (`followed_creators`), acrescenta uma tab "A seguir" à homepage e dispara notificações push (infra nova) quando um criador seguido publica um vídeo.

## Decisões confirmadas com o utilizador
1. **Fonte de dados dos criadores**: tabela `creators` dedicada; `nome`/`avatar_url`/`numero_videos` vêm da YouTube Data API (`channels.list`, 1 unidade/chamada) a partir do `channel_id`; `especialidade` e `destaque` são curados à mão.
2. **Ligação vídeo↔criador**: nova coluna `video_cache.creator_channel_id`. O processo externo (fora deste repo) que popula `video_cache` terá de passar a preencher esta coluna — fora do controlo deste código, documentar como pré-requisito operacional.
3. **Disparo da notificação**: trigger Postgres `AFTER INSERT ON video_cache` + `pg_net` a invocar directamente a Edge Function `notify-new-video`.
4. **Limite plano Grátis**: sem limite — seguir criadores é ilimitado em todos os planos (sem alteração a `packages/config`).

## Ficheiros a Criar

### `packages/types/src/creator.ts`
**Propósito:** tipos de domínio para criadores e subscrições.
```ts
export interface Creator {
  id:             string;
  channel_id:     string;
  nome:           string | null;
  canal:          string | null;
  avatar_url:     string | null;
  especialidade:  string | null;
  numero_videos:  number | null;
  destaque:       boolean;
  cached_at:      string | null;
  created_at:     string;
}

export interface FollowedCreator {
  id:          string;
  user_id:     string;
  creator_id:  string;
  followed_at: string;
}
```

### `packages/supabase/src/queries/creators.ts`
**Propósito:** camada de queries puras, mesmo padrão de `recipes.ts`/`feed.ts` (sem embedding PostgREST — o resto do repo não usa `.select('*, tabela(*)')`, e `Database['public']['Tables'][x]['Relationships']` está sempre `[]`, pelo que embedding não teria tipagem correcta).
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

export async function getFeaturedCreators(client: SupabaseClient<Database>, limit = 20) {
  return client.from('creators').select('*').eq('destaque', true).order('nome').limit(limit);
}

export async function getCreatorById(client: SupabaseClient<Database>, id: string) {
  return client.from('creators').select('*').eq('id', id).single();
}

export async function getCreatorsByIds(client: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return { data: [], error: null } as const;
  return client.from('creators').select('*').in('id', ids);
}

export async function getFollowedCreators(client: SupabaseClient<Database>, userId: string) {
  return client.from('followed_creators').select('*').eq('user_id', userId);
}

export async function followCreator(client: SupabaseClient<Database>, userId: string, creatorId: string) {
  return client.from('followed_creators').insert({ user_id: userId, creator_id: creatorId }).select().single();
}

export async function unfollowCreator(client: SupabaseClient<Database>, userId: string, creatorId: string) {
  return client.from('followed_creators').delete().eq('user_id', userId).eq('creator_id', creatorId);
}
```

### `apps/mobile/src/stores/followedCreatorsStore.ts`
**Propósito:** store Zustand, mesmo padrão de `savedRecipesStore.ts` (confirm-then-update, `loadedUserId` evita refetch). Guarda os `followed_creators` (relação) e os `Creator` completos num array paralelo (sem embedding).
```ts
import { create } from 'zustand';
import type { FollowedCreator, Creator } from '@emealia/types';

interface FollowedCreatorsState {
  items:        FollowedCreator[];
  creators:     Creator[];
  loading:      boolean;
  loadedUserId: string | null;
  setItems:     (userId: string, items: FollowedCreator[], creators: Creator[]) => void;
  setLoading:   (loading: boolean) => void;
  addFollow:    (item: FollowedCreator, creator: Creator) => void;
  removeFollow: (creatorId: string) => void;
  reset:        () => void;
}

export const useFollowedCreatorsStore = create<FollowedCreatorsState>((set) => ({
  items:        [],
  creators:     [],
  loading:      true,
  loadedUserId: null,
  setItems:     (userId, items, creators) => set({ items, creators, loadedUserId: userId, loading: false }),
  setLoading:   (loading) => set({ loading }),
  addFollow:    (item, creator) => set((s) => ({ items: [item, ...s.items], creators: [creator, ...s.creators] })),
  removeFollow: (creatorId) => set((s) => ({
    items:    s.items.filter((i) => i.creator_id !== creatorId),
    creators: s.creators.filter((c) => c.id !== creatorId),
  })),
  reset: () => set({ items: [], creators: [], loadedUserId: null, loading: false }),
}));
```

### `apps/mobile/src/hooks/useFollowedCreators.ts`
**Propósito:** liga store + queries, mesmo padrão de `useSavedRecipes.ts`. `follow` recebe o `Creator` completo (já disponível no ecrã chamador) para actualizar a store sem refetch.
```ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getFollowedCreators, getCreatorsByIds, followCreator, unfollowCreator } from '@emealia/supabase';
import { useFollowedCreatorsStore } from '@/stores/followedCreatorsStore';
import type { Creator } from '@emealia/types';

export function useFollowedCreators(userId: string | undefined) {
  const items    = useFollowedCreatorsStore((s) => s.items);
  const creators = useFollowedCreatorsStore((s) => s.creators);
  const loading  = useFollowedCreatorsStore((s) => s.loading);

  useEffect(() => {
    if (!userId) { useFollowedCreatorsStore.getState().reset(); return; }
    if (useFollowedCreatorsStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    useFollowedCreatorsStore.getState().setLoading(true);
    const { data: follows, error } = await getFollowedCreators(supabase!, uid);
    if (error) { console.error('[useFollowedCreators] getFollowedCreators falhou:', error); useFollowedCreatorsStore.getState().setItems(uid, [], []); return; }
    const { data: creatorsData } = await getCreatorsByIds(supabase!, (follows ?? []).map((f) => f.creator_id));
    useFollowedCreatorsStore.getState().setItems(uid, follows ?? [], creatorsData ?? []);
  }

  async function follow(creator: Creator) {
    if (!userId) return;
    const { data, error } = await followCreator(supabase!, userId, creator.id);
    if (error) { console.error('[useFollowedCreators] followCreator falhou:', error); return; }
    if (data) useFollowedCreatorsStore.getState().addFollow(data, creator);
  }

  async function unfollow(creatorId: string) {
    if (!userId) return;
    const { error } = await unfollowCreator(supabase!, userId, creatorId);
    if (error) { console.error('[useFollowedCreators] unfollowCreator falhou:', error); return; }
    useFollowedCreatorsStore.getState().removeFollow(creatorId);
  }

  function isFollowing(creatorId: string) {
    return items.some((f) => f.creator_id === creatorId);
  }

  return { items, creators, loading, follow, unfollow, isFollowing, channelIds: creators.map((c) => c.channel_id) };
}
```

### `apps/mobile/src/hooks/useFeaturedCreators.ts`
**Propósito:** dados públicos partilhados, sem store dedicada — mesmo espírito de `useFeed.ts` (estado local, sem Zustand).
```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getFeaturedCreators } from '@emealia/supabase';
import type { Creator } from '@emealia/types';

export function useFeaturedCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getFeaturedCreators(supabase!).then(({ data, error }) => {
      if (error) setError(error.message); else setCreators(data ?? []);
      setLoading(false);
    });
  }, []);

  return { creators, loading, error };
}
```

### `apps/mobile/src/hooks/usePushNotifications.ts`
**Propósito:** regista o token Expo Push no primeiro "Seguir" (não pede permissão antes disso — sem precedente no código, decisão de UX desta spec). Guarda em `profiles.expo_push_token` reutilizando `updateProfile` já existente.
```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@emealia/supabase';

export function usePushNotifications() {
  async function registerForPush(userId: string) {
    if (!Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await updateProfile(supabase!, userId, { expo_push_token: token });
    return token;
  }

  return { registerForPush };
}
```

### `apps/mobile/src/components/creators/FollowButton.tsx`
**Propósito:** primeiro botão de seguir/deixar-de-seguir reutilizável do repo (usado em `CreatorCard` e no perfil do criador — `RecipeCard` mantém o toggle inline porque só tem um call site).
```tsx
import { Pressable, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface FollowButtonProps {
  following: boolean;
  onPress:   () => void;
}

export function FollowButton({ following, onPress }: FollowButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical:   8,
        borderRadius:      radius.full,
        borderWidth:       1,
        borderColor:       colors.primary,
        backgroundColor:   following ? 'transparent' : colors.primary,
      }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: following ? colors.primary : colors.primaryDark }}>
        {following ? 'A seguir' : 'Seguir'}
      </Text>
    </Pressable>
  );
}
```

### `apps/mobile/src/components/creators/CreatorCard.tsx`
**Propósito:** linha de lista em "Criadores em Destaque" — avatar, nome, especialidade, nº receitas, `FollowButton`. Toque no corpo navega para o perfil.
```tsx
import { View, Text, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { FollowButton } from './FollowButton';
import type { Creator } from '@emealia/types';

interface CreatorCardProps {
  creator:        Creator;
  following:      boolean;
  onToggleFollow: () => void;
}

export function CreatorCard({ creator, following, onToggleFollow }: CreatorCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/creators/${creator.id}`)}
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: colors.bgDarkAlt,
        borderRadius:    radius.lg,
        padding:         spacing.md,
        marginBottom:    spacing.md,
      }}
    >
      <Image
        source={{ uri: creator.avatar_url ?? undefined }}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border }}
      />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }}>
          {creator.nome ?? creator.canal}
        </Text>
        {creator.especialidade && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {creator.especialidade}
          </Text>
        )}
        {creator.numero_videos != null && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {creator.numero_videos} vídeos
          </Text>
        )}
      </View>
      <FollowButton following={following} onPress={onToggleFollow} />
    </Pressable>
  );
}
```

### `apps/mobile/app/creators/index.tsx`
**Propósito:** ecrã "Criadores em Destaque", rota não-tab empurrada (mesmo padrão de `app/macros.tsx`).
```tsx
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useFeaturedCreators } from '@/hooks/useFeaturedCreators';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { CreatorCard } from '@/components/creators/CreatorCard';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Creator } from '@emealia/types';

export default function CreatorsScreen() {
  const { user } = useAuth();
  const { creators, loading } = useFeaturedCreators();
  const { isFollowing, follow, unfollow } = useFollowedCreators(user?.id);
  const { registerForPush } = usePushNotifications();

  async function handleToggleFollow(creator: Creator) {
    if (!user?.id) return;
    if (isFollowing(creator.id)) {
      unfollow(creator.id);
    } else {
      follow(creator);
      registerForPush(user.id);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          Criadores em Destaque
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={creators}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          renderItem={({ item }) => (
            <CreatorCard creator={item} following={isFollowing(item.id)} onToggleFollow={() => handleToggleFollow(item)} />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
                Ainda não há criadores em destaque.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
```

### `apps/mobile/app/creators/[id].tsx`
**Propósito:** perfil do criador — dados, `FollowButton`, vídeos recentes de `video_cache` filtrados por `creator_channel_id` (via `useFeed` estendido).
```tsx
import { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useFeed } from '@/hooks/useFeed';
import { FollowButton } from '@/components/creators/FollowButton';
import { supabase } from '@/lib/supabase';
import { getCreatorById } from '@emealia/supabase';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Creator } from '@emealia/types';

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const { isFollowing, follow, unfollow } = useFollowedCreators(user?.id);
  const { registerForPush } = usePushNotifications();

  useEffect(() => {
    if (!id) return;
    getCreatorById(supabase!, id).then(({ data }) => setCreator(data ?? null));
  }, [id]);

  const { videos, loading } = useFeed(undefined, [], creator ? [creator.channel_id] : undefined);

  async function handleToggleFollow() {
    if (!user?.id || !creator) return;
    if (isFollowing(creator.id)) unfollow(creator.id);
    else { follow(creator); registerForPush(user.id); }
  }

  if (!creator) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
        <Image
          source={{ uri: creator.avatar_url ?? undefined }}
          style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border }}
        />
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.primary, marginTop: spacing.sm }}>
          {creator.nome ?? creator.canal}
        </Text>
        {creator.especialidade && (
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>{creator.especialidade}</Text>
        )}
        <View style={{ marginTop: spacing.sm }}>
          <FollowButton following={isFollowing(creator.id)} onPress={handleToggleFollow} />
        </View>
      </View>

      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.textInverted, paddingHorizontal: spacing.lg }}>
        Vídeos recentes
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          horizontal
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={{ width: 140, height: 200, borderRadius: 12, marginRight: spacing.sm }}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.regular }}>Ainda sem vídeos.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
```

### `supabase/functions/sync-creator/index.ts`
**Propósito:** Edge Function invocada manualmente (curadoria admin) para preencher `nome`/`avatar_url`/`numero_videos` de um `creators.channel_id` a partir de `channels.list`. `YOUTUBE_API_KEY` nunca sai do servidor (regra 6 do CLAUDE.md).
```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOUTUBE_API_KEY           = Deno.env.get('YOUTUBE_API_KEY')!;
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  const { channel_id } = await req.json();
  if (!channel_id) {
    return new Response(JSON.stringify({ error: 'channel_id em falta' }), { status: 400 });
  }

  // channels.list custa 1 unidade/chamada — muito mais barato que search.list
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id:   channel_id,
    key:  YOUTUBE_API_KEY,
  });
  const res  = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) {
    return new Response(JSON.stringify({ error: 'canal não encontrado na YouTube API' }), { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('creators')
    .update({
      nome:          channel.snippet.title,
      avatar_url:    channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url,
      numero_videos: Number(channel.statistics.videoCount ?? 0),
      cached_at:     new Date().toISOString(),
    })
    .eq('channel_id', channel_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

### `supabase/functions/notify-new-video/index.ts`
**Propósito:** invocada pelo trigger Postgres (`pg_net`) quando `video_cache` recebe um INSERT com `creator_channel_id` preenchido. Notifica todos os utilizadores que seguem esse criador.
```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (req) => {
  const { video_id, creator_channel_id } = await req.json();
  if (!creator_channel_id) {
    return new Response(JSON.stringify({ ok: true, skipped: 'sem creator_channel_id' }));
  }

  const { data: video } = await supabaseAdmin
    .from('video_cache')
    .select('titulo')
    .eq('id', video_id)
    .single();

  const { data: creator } = await supabaseAdmin
    .from('creators')
    .select('id, nome')
    .eq('channel_id', creator_channel_id)
    .single();

  if (!creator) {
    return new Response(JSON.stringify({ ok: true, skipped: 'criador não encontrado' }));
  }

  const { data: follows } = await supabaseAdmin
    .from('followed_creators')
    .select('user_id')
    .eq('creator_id', creator.id);

  const userIds = (follows ?? []).map((f) => f.user_id);
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, notified: 0 }));
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);

  const messages = (profiles ?? [])
    .filter((p) => p.expo_push_token)
    .map((p) => ({
      to:    p.expo_push_token,
      sound: 'default',
      title: `Novo vídeo de ${creator.nome ?? 'um criador que segues'}`,
      body:  video?.titulo ?? 'Vídeo novo disponível',
    }));

  // Expo aceita até 100 mensagens por pedido
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Ficheiros a Modificar

### `supabase/schema.sql`
**Modificações:** acrescentar no fim do ficheiro (após linha 191, seguindo o padrão de bloco append-only já usado para F10), um novo bloco "F11 — Criadores em Destaque":
```sql
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
```

### `packages/types/src/user.ts`
**Modificações:**
- [ ] Interface `Profile` (linha 18): acrescentar campo `expo_push_token: string | null;`

### `packages/types/src/feed.ts`
**Modificações:**
- [ ] Interface `VideoItem` (linha 5): acrescentar campo `creator_channel_id: string | null;`

### `packages/types/src/index.ts`
**Modificações:**
- [ ] Acrescentar `export * from './creator';`

### `packages/types/src/database.ts`
**Modificações:**
- [ ] Import (linha 1): acrescentar `Creator, FollowedCreator` a `import type { ... } from './creator';`
- [ ] Dentro de `Tables` (após a entrada `macro_daily_totals`, antes do `};` de fecho, linha ~57): acrescentar
```ts
creators: {
  Row:           Simplify<Creator>;
  Insert:        Simplify<Omit<Creator, 'id' | 'created_at'>>;
  Update:        Simplify<Partial<Creator>>;
  Relationships: [];
};
followed_creators: {
  Row:           Simplify<FollowedCreator>;
  Insert:        Simplify<Omit<FollowedCreator, 'id' | 'followed_at'>>;
  Update:        Simplify<Partial<FollowedCreator>>;
  Relationships: [];
};
```

### `packages/supabase/src/index.ts`
**Modificações:**
- [ ] Acrescentar `export * from './queries/creators';`

### `packages/supabase/src/queries/feed.ts`
**Modificações:** estender `getFeed` com filtro opcional por criadores seguidos (parâmetro final, mantém compatibilidade posicional):
```ts
export async function getFeed(
  client: SupabaseClient<Database>,
  filtro?: FiltroDietetico,
  limit = 20,
  creatorChannelIds?: string[]
) {
  let query = client
    .from('video_cache')
    .select('*')
    .order('views', { ascending: false })
    .limit(limit);

  if (filtro) query = query.contains('filtros', [filtro]);
  if (creatorChannelIds) query = query.in('creator_channel_id', creatorChannelIds);

  return query;
}
```

### `apps/mobile/src/hooks/useFeed.ts`
**Modificações:** este hook reimplementa a query inline (não usa `getFeed` de `@emealia/supabase`) — é o caminho realmente usado pela app, por isso estende-se aqui:
- [ ] Assinatura: `useFeed(filtro?: FiltroDietetico, filtrosPerfil: FiltroDietetico[] = [], creatorChannelIds?: string[])`
- [ ] Dentro de `fetchFeed`, após a construção da query com `filtro`, acrescentar `if (creatorChannelIds) query = query.in('creator_channel_id', creatorChannelIds);`
- [ ] Se `creatorChannelIds` tem `length === 0`, saltar a query e definir `videos: []` directamente (evita pedido de rede desnecessário quando o utilizador não segue ninguém)
- [ ] O fallback para `MOCK_VIDEOS` só deve acontecer quando `creatorChannelIds` for `undefined` (mocks não têm `creator_channel_id`; usá-los na tab "A seguir" mostraria conteúdo não relacionado em vez do estado vazio correcto): `data.length === 0 && !creatorChannelIds`
- [ ] `useEffect` deps: acrescentar `creatorChannelIds?.join(',')`

### `apps/mobile/app/(tabs)/index.tsx`
**Modificações:**
- [ ] Novo estado local `const [vista, setVista] = useState<'descobrir' | 'a_seguir'>('descobrir');` (mesmo padrão `Vista` de `app/macros.tsx`)
- [ ] Importar e usar `useFollowedCreators(user?.id)` para obter `channelIds`
- [ ] Segunda fila de `Pill` (abaixo do título, acima dos filtros `FEED_FILTER_OPTIONS`): `Pill label="Descobrir"` / `Pill label="A seguir"` a alternar `vista`
- [ ] `useFeed` passa a receber o terceiro argumento condicionalmente: `useFeed(filtroSelecionado ?? undefined, filtrosPerfil, vista === 'a_seguir' ? channelIds : undefined)`
- [ ] Quando `vista === 'a_seguir'` e `channelIds.length === 0`: renderizar estado vazio em vez do `CarouselStrip` — texto "Ainda não segues nenhum criador." + `Button` "Explorar Criadores em Destaque" a navegar para `router.push('/creators')`
- [ ] No cabeçalho (ao lado do título "eMealia"), acrescentar `Pressable` com `Ionicons name="people-circle-outline"` a navegar para `/creators` — único ponto de entrada para "Criadores em Destaque" (não há tab disponível; as 6 tabs em `(tabs)/_layout.tsx` estão fixas e sem precedente de `SegmentedControl`/tabs internas)

### `apps/mobile/app.json`
**Modificações:**
- [ ] Array `expo.plugins`: acrescentar `"expo-notifications"` (sem configuração de ícone/cor — não existe asset dedicado; usa o ícone default do sistema)

### `apps/mobile/package.json`
**Modificações:**
- [ ] Acrescentar dependência `expo-device` (necessária para `Device.isDevice` antes de pedir permissão de push — Android/iOS emuladores não suportam push tokens). Confirmar a versão compatível com Expo SDK 53 (`npx expo install expo-device --dry-run` apenas para ver a versão sugerida, depois instalar fixando com `npm install expo-device@<versão>` — nunca `npx expo install` directamente, por `legacy-peer-deps=true` no `.npmrc`)

## Fases de Implementação

### Fase 1: Base de dados — schema.sql
**Ficheiros:**
- Modificar `supabase/schema.sql`

**Critérios de sucesso (automáticos):**
- [ ] Script corre sem erros no Supabase SQL Editor (idempotente — corrível 2x)

**Critérios de sucesso (manuais):**
- [ ] `select * from creators limit 1;`, `select * from followed_creators limit 1;` devolvem 0 linhas sem erro
- [ ] `\d video_cache` mostra a coluna `creator_channel_id`
- [ ] `\d profiles` mostra a coluna `expo_push_token`
- [ ] Secrets `project_url` e `service_role_key` criados no Vault (`select name from vault.secrets;`)

### Fase 2: Tipos e queries partilhadas
**Ficheiros:**
- Criar `packages/types/src/creator.ts`, `packages/supabase/src/queries/creators.ts`
- Modificar `packages/types/src/{user,feed,index,database}.ts`, `packages/supabase/src/index.ts`, `packages/supabase/src/queries/feed.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (raiz do monorepo) passa sem erros

### Fase 3: Edge Functions
**Ficheiros:**
- Criar `supabase/functions/sync-creator/index.ts`, `supabase/functions/notify-new-video/index.ts`

**Critérios de sucesso (manuais):**
- [ ] Inserir manualmente uma linha em `creators` com `channel_id` real, invocar `sync-creator` via `supabase functions invoke sync-creator --data '{"channel_id":"UC..."}'`, confirmar que `nome`/`avatar_url`/`numero_videos` ficam preenchidos
- [ ] Inserir manualmente uma linha em `video_cache` com `creator_channel_id` preenchido e um utilizador de teste em `followed_creators` com `expo_push_token` válido (obtido do Fase 5); confirmar recepção da notificação no dispositivo

### Fase 4: Store + hooks mobile
**Ficheiros:**
- Criar `apps/mobile/src/stores/followedCreatorsStore.ts`, `apps/mobile/src/hooks/{useFollowedCreators,useFeaturedCreators,usePushNotifications}.ts`
- Modificar `apps/mobile/src/hooks/useFeed.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` passa sem erros

### Fase 5: Componentes e ecrãs
**Ficheiros:**
- Criar `apps/mobile/src/components/creators/{FollowButton,CreatorCard}.tsx`, `apps/mobile/app/creators/{index,[id]}.tsx`
- Modificar `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app.json`, `apps/mobile/package.json`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` (apps/mobile) sem erros
- [ ] `expo lint` sem warnings
- [ ] Todos os componentes novos abaixo de 150 linhas

**Critérios de sucesso (manuais):**
- [ ] Abrir `/creators` a partir do ícone no cabeçalho da homepage — lista de criadores em destaque aparece com avatar/nome/especialidade/nº vídeos
- [ ] Tocar "Seguir" num criador — botão muda para "A seguir"; pedido de permissão de notificações aparece na primeira vez
- [ ] Tocar num criador — abre o perfil com vídeos recentes desse canal
- [ ] Deixar de seguir no perfil — reflecte-se na lista de destaque ao voltar atrás
- [ ] Homepage → Pill "A seguir" sem nenhum criador seguido → estado vazio com CTA para `/creators`
- [ ] Homepage → Pill "A seguir" com ≥1 criador seguido → feed mostra só vídeos desses `creator_channel_id`

## Estratégia de Testes
- **Unit:** nenhum framework de testes automatizados identificado no repo (sem `jest`/`vitest` configurado) — validar por `tsc --noEmit` + testes manuais acima.
- **Manual:** ver critérios de sucesso manuais por fase, no simulador iOS/Android (push notifications só funcionam em dispositivo físico — `Device.isDevice`).

## Notas de Implementação
- **`video_cache.creator_channel_id` depende de um processo externo**: nenhuma escrita em `video_cache` existe neste repo (research: "nenhum INSERT/UPDATE encontrado"). Esta spec assume que esse processo (fora do repo) passará a preencher a nova coluna — sem isso, o perfil do criador e a tab "A seguir" ficam sempre vazios e a notificação nunca dispara. Confirmar com quem gere esse processo antes de dar a feature por completa.
- **Secrets do Vault nunca vão para o git** — `project_url` e `service_role_key` são criados directamente no SQL Editor do Dashboard, não fazem parte de `schema.sql` versionado.
- **Quota YouTube API**: `channels.list` custa 1 unidade/chamada (vs. 100 de `search.list`, já em uso) — `sync-creator` é invocada manualmente por criador, sem risco de esgotar a quota diária mesmo com dezenas de criadores parceiros.
- **RLS de `creators`**: propositadamente sem RLS de utilizador, seguindo o mesmo padrão (e a mesma ressalva) de `video_cache` — dados partilhados, sem dono. Isto significa que, tal como `video_cache` hoje, a tabela fica gravável por qualquer role com acesso PostgREST se os `GRANTs` por omissão não forem revistos; é uma limitação pré-existente no projecto, não introduzida por esta spec.
- **Registo do push token**: só acontece no primeiro "Seguir" (não no login/onboarding) — evita pedir permissão antes de haver motivo. Se o utilizador recusar, o "Seguir" continua a funcionar, apenas sem notificações.
- **Sem limite de criadores seguidos** em nenhum plano — não mexer em `packages/config/src/index.ts` `LIMITS`.
- **GDPR**: `expo_push_token` fica em `profiles`, já em Supabase Frankfurt (EU) — sem novo risco de localização de dados.

## Referências
- Research: `thoughts/shared/research/2026-07-30-criadores-em-destaque.md`
- Ticket original: `thoughts/shared/tickets/2026-07-30-criadores-em-destaque.md`
- Padrão saved_recipes: `supabase/schema.sql:67-90`, `packages/supabase/src/queries/recipes.ts`, `apps/mobile/src/hooks/useSavedRecipes.ts`, `apps/mobile/src/stores/savedRecipesStore.ts`
- Padrão de Edge Function com service role: `supabase/functions/revenuecat-webhook/index.ts`
- Padrão de Edge Function YouTube: `supabase/functions/youtube-feed/index.ts`
- Padrão de ecrã não-tab + Vista/Pills: `apps/mobile/app/macros.tsx`
