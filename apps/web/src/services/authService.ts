import { API_URL } from '@/config/api';
import type { UserProfile } from '@/types';

const TOKEN_KEY = 'six3.authToken';
const REFRESH_TOKEN_KEY = 'six3.refreshToken';

export type AuthSession = {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
};

type ApiError = Error & { code?: string; status?: number };

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.code || 'Erro ao autenticar.') as ApiError;
    error.code = payload?.code || payload?.error;
    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  if (session.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!getAuthToken()) return null;
  const { user } = await request<{ user: UserProfile }>('/api/auth/me');
  return user;
}

export async function updateUserProfile(_uid: string, data: Partial<UserProfile>) {
  const { user } = await request<{ user: UserProfile }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return user;
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
};

export function parseFirebaseError(code?: string): string {
  return FIREBASE_ERRORS[code || ''] || 'Erro ao autenticar. Tente novamente.';
}
