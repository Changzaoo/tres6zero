import { useEffect } from 'react';
import { toast } from '@/components/ui/Toast';

const READY_KEY = 'six3.offlineReadyToastShown';

export function OfflineReadyToast() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready
      .then(() => {
        if (localStorage.getItem(READY_KEY)) return;
        localStorage.setItem(READY_KEY, '1');
        toast.success('Este app agora funciona offline neste dispositivo.');
      })
      .catch(() => undefined);
  }, []);

  return null;
}

