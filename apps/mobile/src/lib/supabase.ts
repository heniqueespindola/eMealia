import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@emealia/types';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Supabase só é inicializado se as variáveis existirem
// Em dev sem .env, retorna null e os hooks devem tratar este caso
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnon) {
    console.warn(
      '[eMealia] Supabase não configurado. Cria um ficheiro .env com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnon, {
    auth: {
      storage:            ExpoSecureStoreAdapter,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();
