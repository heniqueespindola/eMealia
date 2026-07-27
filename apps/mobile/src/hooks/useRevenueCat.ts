import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering, planoFromCustomerInfo } from '@/lib/revenuecat';
import { updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useRevenueCat(userId: string | undefined) {
  const [offering, setOffering]   = useState<PurchasesOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  useEffect(() => {
    getCurrentOffering().then(setOffering).catch(() => setOffering(null));
  }, []);

  async function sincronizarPlano(customerInfo: CustomerInfo) {
    if (!userId) return;
    const plano = planoFromCustomerInfo(customerInfo);
    const revenuecatId = await Purchases.getAppUserID();
    const profileAtual = useProfileStore.getState().profile;
    if (profileAtual) {
      useProfileStore.getState().setProfile({ ...profileAtual, plano, revenuecat_id: revenuecatId });
    }
    await updateProfile(supabase!, userId, { plano, revenuecat_id: revenuecatId });
  }

  async function comprar(pacote: PurchasesPackage): Promise<{ ok: true } | { ok: false; cancelado: boolean }> {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);
      await sincronizarPlano(customerInfo);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, cancelado: !!e?.userCancelled };
    } finally {
      setPurchasing(false);
    }
  }

  async function restaurar(): Promise<boolean> {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      await sincronizarPlano(customerInfo);
      return true;
    } catch {
      return false;
    } finally {
      setRestoring(false);
    }
  }

  return { offering, purchasing, restoring, comprar, restaurar };
}
