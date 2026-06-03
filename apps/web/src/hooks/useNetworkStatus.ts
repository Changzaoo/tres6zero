import { useEffect, useState } from 'react';
import { getNetworkStatus, subscribeNetworkStatus } from '@/offline/networkStatus';
import type { NetworkStatusSnapshot } from '@/offline/offlineTypes';

export function useNetworkStatus(): NetworkStatusSnapshot {
  const [status, setStatus] = useState(getNetworkStatus);

  useEffect(() => subscribeNetworkStatus(setStatus), []);

  return status;
}

