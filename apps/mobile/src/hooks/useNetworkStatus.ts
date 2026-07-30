import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  // isConnected === false é o sinal fiável (ver research: isInternetReachable
  // tem bug documentado de falso-negativo persistente — issue #615).
  const isOffline = netInfo.isConnected === false;
  return { isOffline, isConnected: netInfo.isConnected, isInternetReachable: netInfo.isInternetReachable };
}
