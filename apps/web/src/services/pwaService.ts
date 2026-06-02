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

  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        requestPersistentStorage();
        registration.update().catch(() => {});
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
