import { logOffline } from '@/offline/offlineLogger';
import { runOfflineSync } from '@/offline/syncEngine';

function canUseServiceWorker() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && !import.meta.env.DEV;
}

function requestPersistentStorage() {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) return;

  navigator.storage.persist().catch((error) => {
    console.warn('[pwa] Persistent storage request failed:', error);
  });
}

export function registerServiceWorker() {
  if (!canUseServiceWorker()) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SIX3_BACKGROUND_SYNC') {
      runOfflineSync().catch((error) => {
        logOffline('warn', 'service-worker', 'Falha ao sincronizar pelo service worker.', {
          error: error instanceof Error ? error.message : String(error),
        }).catch(() => undefined);
      });
    }
  });

  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        requestPersistentStorage();
        registration.update().catch(() => {});
        const syncRegistration = registration as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };
        syncRegistration.sync?.register('six3-sync-queue').catch(() => undefined);
      })
      .catch((error) => {
        console.warn('[pwa] Service worker registration failed:', error);
      });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(register, { timeout: 1600 });
    return;
  }

  globalThis.setTimeout(register, 0);
}
