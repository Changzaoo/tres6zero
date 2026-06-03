import { useNetworkStatus } from './useNetworkStatus';

export function useOnlineStatus() {
  return useNetworkStatus().isOnline;
}
