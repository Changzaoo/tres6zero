import { API_URL } from '@/config/api';
import type { UserProfile } from '@/types';

const TOKEN_KEY = 'six3.authToken';
const REFRESH_TOKEN_KEY = 'six3.refreshToken';
const DEVICE_ID_KEY = 'six3.deviceId';
const USER_CACHE_KEY = 'six3.cachedUser';
const API_CACHE_PREFIX = 'six3.apiCache.';
const TOKEN_COOKIE_KEY = 'six3_auth_token';
const REFRESH_COOKIE_KEY = 'six3_refresh_token';
const DEVICE_COOKIE_KEY = 'six3_device_id';
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const API_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type AuthSession = {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
};

type ApiError = Error & { code?: string; status?: number };

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function storageGet(key: string) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local cookies below keep the session recoverable if storage is blocked.
  }
}

function storageRemove(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cookieOptions(maxAge: number) {
  const secure = isBrowser() && window.location.protocol === 'https:' ? '; Secure' : '';
  return `; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (!isBrowser()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieOptions(maxAge)}`;
}

function getCookie(name: string) {
  if (!isBrowser()) return null;
  const match = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function deleteCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function createDeviceId() {
  if (!isBrowser()) return 'server-device-unavailable';
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cacheUserProfile(user: UserProfile | null) {
  if (!user) {
    storageRemove(USER_CACHE_KEY);
    return;
  }

  storageSet(USER_CACHE_KEY, JSON.stringify(user));
}

export function getCachedUser() {
  const raw = storageGet(USER_CACHE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    storageRemove(USER_CACHE_KEY);
    return null;
  }
}

function isGetRequest(options: RequestInit) {
  return !options.method || options.method.toUpperCase() === 'GET';
}

function canCacheApiResponse(path: string, options: RequestInit) {
  if (!isGetRequest(options)) return false;
  if (!path.startsWith('/api/')) return false;
  return ![
    '/api/auth/',
    '/api/billing/',
    '/api/support/',
    '/api/notifications/',
    '/api/upload/',
    '/api/video/process',
    '/api/events/admin/',
  ].some((blockedPath) => path.includes(blockedPath));
}

function apiCacheKey(path: string) {
  const userScope = getCachedUser()?.uid || 'public';
  return `${API_CACHE_PREFIX}${hashString(`${userScope}|${path}`)}`;
}

function readApiCache<T>(path: string): T | null {
  const raw = storageGet(apiCacheKey(path));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as { value: T; savedAt: number };
    if (!cached?.savedAt || Date.now() - cached.savedAt > API_CACHE_MAX_AGE_MS) {
      storageRemove(apiCacheKey(path));
      return null;
    }
    return cached.value;
  } catch {
    storageRemove(apiCacheKey(path));
    return null;
  }
}

function writeApiCache<T>(path: string, value: T) {
  storageSet(apiCacheKey(path), JSON.stringify({ value, savedAt: Date.now() }));
}

export function getDeviceId() {
  const existing = storageGet(DEVICE_ID_KEY) || getCookie(DEVICE_COOKIE_KEY);
  if (existing) return existing;

  const deviceId = createDeviceId();
  storageSet(DEVICE_ID_KEY, deviceId);
  setCookie(DEVICE_COOKIE_KEY, deviceId, DEVICE_COOKIE_MAX_AGE);
  return deviceId;
}

function getDeviceName() {
  if (!isBrowser()) return 'Servidor';
  const nav = window.navigator as Navigator & {
    userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
  };
  const platform = nav.userAgentData?.platform || nav.platform || 'Dispositivo';
  const brand = nav.userAgentData?.brands?.find((item) => !/not/i.test(item.brand))?.brand;
  return `${platform}${brand ? ` - ${brand}` : ''}`;
}

export function deviceHeaders() {
  return {
    'X-SIX3-Device-ID': getDeviceId(),
    'X-SIX3-Device-Name': getDeviceName(),
  };
}

function persistAuthTokens(token: string, refreshToken?: string, expiresIn = 3600) {
  storageSet(TOKEN_KEY, token);
  setCookie(TOKEN_COOKIE_KEY, token, Math.max(60, expiresIn));

  if (refreshToken) {
    storageSet(REFRESH_TOKEN_KEY, refreshToken);
    setCookie(REFRESH_COOKIE_KEY, refreshToken, REFRESH_COOKIE_MAX_AGE);
  }
}

export function getAuthToken() {
  return storageGet(TOKEN_KEY) || getCookie(TOKEN_COOKIE_KEY);
}

function getRefreshToken() {
  return storageGet(REFRESH_TOKEN_KEY) || getCookie(REFRESH_COOKIE_KEY);
}

function authHeaders(token = getAuthToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshAuthToken() {
  const refreshToken = getRefreshToken();
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!refreshToken || !apiKey) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.id_token) {
    clearAuthSession();
    return null;
  }

  const token = String(payload.id_token);
  const nextRefreshToken = payload.refresh_token ? String(payload.refresh_token) : refreshToken;
  const expiresIn = Number(payload.expires_in || 3600);
  persistAuthTokens(token, nextRefreshToken, expiresIn);
  return token;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cacheable = canCacheApiResponse(path, options);

  async function send(token = getAuthToken()) {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    Object.entries(authHeaders(token)).forEach(([key, value]) => headers.set(key, value));
    Object.entries(deviceHeaders()).forEach(([key, value]) => headers.set(key, value));

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  }

  let response: Response;

  try {
    response = await send();
  } catch (error) {
    const cached = cacheable ? readApiCache<T>(path) : null;
    if (cached) return cached;
    throw error;
  }

  if (response.status === 401 && getRefreshToken()) {
    const refreshedToken = await refreshAuthToken();
    if (refreshedToken) {
      try {
        response = await send(refreshedToken);
      } catch (error) {
        const cached = cacheable ? readApiCache<T>(path) : null;
        if (cached) return cached;
        throw error;
      }
    }
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const cached = cacheable && (response.status === 503 || !isBrowser() || !window.navigator.onLine)
      ? readApiCache<T>(path)
      : null;
    if (cached) return cached;

    if (payload?.code === 'DEVICE_DISCONNECTED' || payload?.error === 'DEVICE_DISCONNECTED') {
      clearAuthSession();
    }

    const error = new Error(payload?.error || payload?.code || 'Erro ao autenticar.') as ApiError;
    error.code = payload?.code || payload?.error;
    error.status = response.status;
    throw error;
  }

  if (cacheable) {
    writeApiCache(path, payload as T);
  }

  return payload as T;
}

const request = apiRequest;

export function setAuthSession(session: AuthSession) {
  persistAuthTokens(session.token, session.refreshToken, session.expiresIn || 3600);
  cacheUserProfile(session.user);
}

export function clearAuthSession() {
  storageRemove(TOKEN_KEY);
  storageRemove(REFRESH_TOKEN_KEY);
  storageRemove(USER_CACHE_KEY);
  deleteCookie(TOKEN_COOKIE_KEY);
  deleteCookie(REFRESH_COOKIE_KEY);
}

export async function register(name: string, email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setAuthSession(session);
  return session;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthSession(session);
  return session;
}

export async function logout() {
  clearAuthSession();
}

export async function resetPassword(email: string) {
  await request<{ ok: boolean }>('/api/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function changePassword(newPassword: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });
  setAuthSession(session);
  return session;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!getAuthToken()) {
    const refreshedToken = await refreshAuthToken();
    if (!refreshedToken) return null;
  }

  const { user } = await request<{ user: UserProfile }>('/api/auth/me');
  cacheUserProfile(user);
  return user;
}

export async function updateUserProfile(_uid: string, data: Partial<UserProfile>) {
  const { user } = await request<{ user: UserProfile }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  cacheUserProfile(user);
  return user;
}

export async function disconnectDevice(deviceId: string) {
  return request<{ ok: true; currentDisconnected: boolean; user: UserProfile }>(`/api/auth/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
}

export async function disconnectAllDevices() {
  return request<{ ok: true; currentDisconnected: boolean }>('/api/auth/devices', {
    method: 'DELETE',
  });
}

export async function getAdminSession() {
  return request<{ ok: true; user: UserProfile }>('/api/auth/admin/session');
}

const FIREBASE_ERRORS: Record<string, string> = {
  EMAIL_NOT_FOUND: 'Usuário não encontrado.',
  INVALID_PASSWORD: 'Senha incorreta.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha inválidos.',
  EMAIL_EXISTS: 'Este e-mail já está cadastrado.',
  WEAK_PASSWORD: 'A senha deve ter pelo menos 6 caracteres.',
  INVALID_EMAIL: 'E-mail inválido.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Tente novamente mais tarde.',
  AUTH_REQUIRED: 'Faça login para continuar.',
  PAYMENT_REQUIRED: 'Assinatura necessária para liberar este recurso.',
  DEVICE_ID_REQUIRED: 'Nao foi possivel identificar este dispositivo.',
  DEVICE_DISCONNECTED: 'Este dispositivo foi desconectado da conta.',
};

export function parseFirebaseError(code?: string): string {
  return FIREBASE_ERRORS[code || ''] || 'Erro ao autenticar. Tente novamente.';
}
