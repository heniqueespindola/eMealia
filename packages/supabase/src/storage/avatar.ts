import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadAvatar(client: SupabaseClient, userId: string, fileData: ArrayBuffer, contentType = 'image/jpeg') {
  const path = `${userId}/avatar.jpg`;
  const { error } = await client.storage.from('avatars').upload(path, fileData, { contentType, upsert: true });
  if (error) return { data: null, error };
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  return { data: { publicUrl: `${data.publicUrl}?t=${Date.now()}` }, error: null };
}
