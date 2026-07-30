import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (_req) => {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null)
    .filter('notificacoes_prefs->>alertas_despensa', 'eq', 'true');

  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const limiteStr = limite.toISOString().slice(0, 10);

  const messages: { to: string; sound: string; title: string; body: string }[] = [];
  const notificadoIds: string[] = [];

  for (const profile of profiles ?? []) {
    const { data: itens } = await supabaseAdmin
      .from('pantry_items')
      .select('id, nome')
      .eq('user_id', profile.id)
      .not('expira_em', 'is', null)
      .lte('expira_em', limiteStr)
      .is('alerta_validade_enviado_em', null);

    if (!itens || itens.length === 0) continue;

    messages.push({
      to:    profile.expo_push_token,
      sound: 'default',
      title: 'Alerta de despensa',
      body:  `${itens.map((i) => i.nome).join(', ')} vão expirar em breve`,
    });
    notificadoIds.push(...itens.map((i) => i.id));
  }

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

  if (notificadoIds.length > 0) {
    await supabaseAdmin
      .from('pantry_items')
      .update({ alerta_validade_enviado_em: new Date().toISOString() })
      .in('id', notificadoIds);
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
