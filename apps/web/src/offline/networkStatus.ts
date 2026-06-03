import { logOffline } from './offlineLogger';
import type { NetworkStatusSnapshot } from './offlineTypes';

type Listener = (snapshot: NetworkStatusSnapshot) => void;

const listeners = new Set<Listener>();
let initialized = false;
let pingUrl = '';
let snapshot: NetworkStatusSnapshot = {
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  wasOffline: false,
  connectionType: undefined,
  lastOnlineAt: typeof navigator === 'undefined' ? undefined : new Date().toISOString(),
  lastOfflineAt: undefined,
  isReconnecting: false,
};

function connectionType() {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string };
  };
  return nav.connection?.effectiveType || nav.connection?.type;
}

function emit() {
  snapshot = { ...snapshot, connectionType: connectionType() };
  listeners.forEach((listener) => listener(snapshot));
}

function setOnline(isOnline: boolean) {
  const wasOnline = snapshot.isOnline;
  const now = new Date().toISOString();
  snapshot = {
    ...snapshot,
    isOnline,
    wasOffline: snapshot.wasOffline || !isOnline,
    lastOnlineAt: isOnline ? now : snapshot.lastOnlineAt,
    lastOfflineAt: isOnline ? snapshot.lastOfflineAt : now,
    isReconnecting: isOnline && !wasOnline,
  };

  logOffline('info', 'network', isOnline ? 'Conexao restaurada.' : 'App entrou em modo offline.').catch(() => undefined);
  emit();

  if (snapshot.isReconnecting) {
    window.setTimeout(() => {
      snapshot = { ...snapshot, isReconnecting: false };
      emit();
    }, 2500);
  }
}

export function getNetworkStatus() {
  return snapshot;
}

export function subscribeNetworkStatus(listener: Listener) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export async function pingBackend() {
  if (!pingUrl || typeof fetch === 'undefined') return navigator.onLine;
  try {
    const response = await fetch(pingUrl, { method: 'GET', cache: 'no-store' });
    const online = response.ok;
    if (online !== snapshot.isOnline) setOnline(online);
    return online;
  } catch {
    if (snapshot.isOnline) setOnline(false);
    return false;
  }
}

export function initNetworkStatus(options: { pingUrl?: string } = {}) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  pingUrl = options.pingUrl || '';

  window.addEventListener('online', () => {
    setOnline(true);
    pingBackend().catch(() => undefined);
  });
  window.addEventListener('offline', () => setOnline(false));

  const nav = navigator as Navigator & { connection?: EventTarget };
  nav.connection?.addEventListener?.('change', emit);

  if (!navigator.onLine) {
    setOnline(false);
  } else if (pingUrl) {
    window.setTimeout(() => pingBackend().catch(() => undefined), 1200);
  }
}
