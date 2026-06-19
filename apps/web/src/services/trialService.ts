import { apiRequest, setAuthSession, type AuthSession } from '@/services/authService';
import type { TrialRequest } from '@/types';

export type TrialSignupInput = {
  name: string;
  username: string;
  password: string;
  contactEmail: string;
  phone: string;
  businessName?: string;
  useType?: string;
  description?: string;
};

/**
 * Public endpoint — requests the 3-day free trial. The server creates the
 * account, grants the trial immediately and returns a session, so the visitor
 * is logged in right away.
 */
export async function requestTrial(input: TrialSignupInput): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/auth/trial-signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setAuthSession(session);
  return session;
}

/** Admin-only — lists every trial request submitted from the landing page. */
export async function getTrialRequests(): Promise<TrialRequest[]> {
  const { requests } = await apiRequest<{ requests: TrialRequest[] }>('/api/admin/trial-requests');
  return requests;
}
