const DEFAULT_API_URL = 'https://six3-m0wr.onrender.com';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export function getBackendHealthPingUrl() {
  if (import.meta.env.VITE_ENABLE_BACKEND_HEALTH_PING === 'true') {
    return `${API_URL}/health`;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const api = new URL(API_URL, window.location.href);
    const sameOrigin = api.origin === window.location.origin;
    const localApi = api.hostname === 'localhost' || api.hostname === '127.0.0.1';
    const localApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return sameOrigin || (localApi && localApp) ? `${API_URL}/health` : '';
  } catch {
    return '';
  }
}
