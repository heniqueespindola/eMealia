import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')!;

const PREMIUM_ENTITLEMENT_ID = 'premium';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

// RevenueCat não oferece assinatura HMAC — apenas um "Authorization header
// value" definido pelo utilizador no dashboard (Webhooks > Authorization
// header value), reenviado tal-e-qual no header Authorization de cada
// request. Comparação em tempo constante para evitar timing attacks.
function autorizacaoValida(header: string | null): boolean {
  if (!header || header.length !== REVENUECAT_WEBHOOK_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ REVENUECAT_WEBHOOK_SECRET.charCodeAt(i);
  }
  return diff === 0;
}

function planoFromEntitlements(entitlements: Record<string, { product_identifier: string }>): 'free' | 'premium_monthly' | 'premium_annual' {
  const premium = entitlements[PREMIUM_ENTITLEMENT_ID];
  if (!premium) return 'free';
  return premium.product_identifier === 'premium_annual' ? 'premium_annual' : 'premium_monthly';
}

serve(async (req) => {
  if (!autorizacaoValida(req.headers.get('Authorization'))) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401 });
  }

  const { event } = await req.json();
  const appUserId = event.app_user_id as string;

  const subscriberRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` },
  });
  if (!subscriberRes.ok) {
    return new Response(JSON.stringify({ error: 'falha ao consultar subscriber na RevenueCat' }), { status: 502 });
  }
  const subscriberData = await subscriberRes.json();
  const entitlements = subscriberData.subscriber?.entitlements ?? {};
  const plano = planoFromEntitlements(entitlements);

  await supabaseAdmin
    .from('profiles')
    .update({ plano, revenuecat_id: appUserId })
    .eq('id', appUserId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
