import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@emealia/types';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Nota: o SecureStore (Keychain/Keystore) tem um limite prático ~2048 bytes
// por item, e o token de sessão do Supabase (access_token + refresh_token +
// metadata) costuma ultrapassá-lo, gerando o aviso "Value being stored...
// larger than 2048 bytes". O AsyncStorage não tem esse limite, por isso
// passa a ser o storage do cliente Supabase. Fica sandboxed por app (não
// acessível a outras apps), mas sem encriptação adicional — aceitável para
// um token de sessão, mas evita guardar aqui dados mais sensíveis (ex:
// passwords em claro).

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
      storage:            AsyncStorage,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();

// O cliente pode ser null se o .env não estiver configurado (ver comentário
// acima). A maioria dos hooks/ecrãs assume que, se chegaram a montar, o
// Supabase está configurado — em vez de espalhar `if (!supabase) return`
// por todo o lado (o que mudaria o comportamento silenciosamente), este
// helper centraliza o null-check: satisfaz o TypeScript (retorna sempre um
// SupabaseClient) e lança um erro claro no raro caso de faltar o .env.
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      '[eMealia] Supabase não configurado. Cria um ficheiro .env com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}
