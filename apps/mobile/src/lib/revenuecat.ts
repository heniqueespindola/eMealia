import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import type { Plano } from '@emealia/types';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

export function configurePurchases(): void {
  if (configured) return;
  configured = true;
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn('[eMealia] RevenueCat não configurado — falta EXPO_PUBLIC_REVENUECAT_IOS_KEY/ANDROID_KEY.');
    return;
  }
  Purchases.configure({ apiKey });
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
}

export async function identifyPurchasesUser(userId: string): Promise<void> {
  if (!configured) return;
  await Purchases.logIn(userId);
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export function planoFromCustomerInfo(customerInfo: CustomerInfo): Plano {
  const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) return 'free';
  return entitlement.productIdentifier === 'premium_annual' ? 'premium_annual' : 'premium_monthly';
}
