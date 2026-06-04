import { logOffline } from './offlineLogger';
import type { NetworkStatusSnapshot } from './offlineTypes';

type Listener = (snapshot: NetworkStatusSnapshot) => void;

const listeners = new Set<Listener>();
let initialized = false;
let pingUrl = '';
let pingTimer: number | undefined;
const DEFAULT_PING_INTERVAL_MS = 45_000;

function browserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

let snapshot: NetworkStatusSnapshot = {
  isOnline: browserOnline(),
  wasOffline: false,
  connectionType: undefined,
  isBackendReachable: undefined,
  lastOnlineAt: typeof navigator === 'undefined' ? undefined : new Date().toISOString(),
  lastOfflineAt: undefined,
  lastPingAt: undefined,
  lastPingOkAt: undefined,
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
  if (snapshot.isOnline === isOnline) {
    emit();
    return;
  }

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

  logOffline('info', 'network', isOnline ? 'Conexão restaurada.' : 'App entrou em modo offline.').catch(() => undefined);
  emit();

  if (snapshot.isReconnecting) {
    window.setTimeout(() => {
      snapshot = { ...snapshot, isReconnecting: false };
      emit();
    }, 2500);
  }
}

function setBackendReachable(isBackendReachable: boolean) {
  const now = new Date().toISOString();
  snapshot = {
    ...snapshot,
    isBackendReachable,
    lastPingAt: now,
    lastPingOkAt: isBackendReachable ? now : snapshot.lastPingOkAt,
  };
  emit();
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
  if (!pingUrl || typeof fetch === 'undefined') {
    const online = browserOnline();
    setOnline(online);
    return online;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = controller
    ? window.setTimeout(() => controller.abort(), 8000)
    : undefined;

  try {
    const separator = pingUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${pingUrl}${separator}t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });
    const reachable = response.ok;
    setBackendReachable(reachable);

    if (reachable && !snapshot.isOnline) {
      setOnline(true);
    } else if (!browserOnline()) {
      setOnline(false);
    }

    return reachable;
  } catch (error) {
    setBackendReachable(false);
    if (!browserOnline()) {
      setOnline(false);
    } else {
      await logOffline('warn', 'network', 'Health check do backend falhou, mas o navegador continua online.', {
        error: error instanceof Error ? error.message : 'PING_FAILED',
      }).catch(() => undefined);
    }
    return false;
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

export function initNetworkStatus(options: { pingUrl?: string; pingIntervalMs?: number } = {}) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  pingUrl = options.pingUrl || '';
  const pingIntervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;

  window.addEventListener('online', () => {
    setOnline(true);
    pingBackend().catch(() => undefined);
  });
  window.addEventListener('offline', () => {
    setBackendReachable(false);
    setOnline(false);
  });

  const nav = navigator as Navigator & { connection?: EventTarget };
  nav.connection?.addEventListener?.('change', emit);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setOnline(browserOnline());
      pingBackend().catch(() => undefined);
    }
  });
  window.addEventListener('focus', () => {
    setOnline(browserOnline());
    pingBackend().catch(() => undefined);
  });

  if (!browserOnline()) {
    setOnline(false);
  }

  if (pingUrl) {
    window.setTimeout(() => pingBackend().catch(() => undefined), 1200);
    if (pingIntervalMs > 0) {
      if (pingTimer) window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => pingBackend().catch(() => undefined), pingIntervalMs);
    }
  }
}
