import { apiRequest } from '@/services/authService';
import type { AdminAuditLog, AdminOverview, AdminUserDevice, UserAdminDetails, UserLoginEvent } from '@/types';
import type { PlanId } from '@/config/plans';

export type AdminPlanOrigin = 'payment' | 'manual_admin' | 'affiliate' | 'coupon' | 'trial' | 'promotion' | 'support';

export function getAdminOverview() {
  return apiRequest<AdminOverview>('/api/admin/overview');
}

export function getAdminUserDetails(uid: string) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/details`);
}

export function getAdminUserLoginEvents(uid: string) {
  return apiRequest<{ events: UserLoginEvent[] }>(`/api/admin/users/${encodeURIComponent(uid)}/login-events`);
}

export function getAdminUserDevices(uid: string) {
  return apiRequest<{ devices: AdminUserDevice[] }>(`/api/admin/users/${encodeURIComponent(uid)}/devices`);
}

export function getAdminAuditLogs(targetUserId?: string) {
  const query = targetUserId ? `?targetUserId=${encodeURIComponent(targetUserId)}` : '';
  return apiRequest<{ logs: AdminAuditLog[] }>(`/api/admin/audit-logs${query}`);
}

export function setAdminUserRole(uid: string, role: 'user' | 'support') {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export function createSupportUser(data: { name: string; email: string; password: string }) {
  return apiRequest<UserAdminDetails>('/api/admin/support-users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminUserPlan(uid: string, data: {
  planId: PlanId;
  startsImmediately?: boolean;
  expiresAt?: string | null;
  keepCurrentExpiration?: boolean;
  lifetime?: boolean;
  special?: boolean;
  origin?: AdminPlanOrigin;
  resetLimits?: boolean;
  applyPlanLimits?: boolean;
  reason: string;
}) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/plan`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adjustAdminUserPlanDays(uid: string, data: {
  mode: 'add' | 'remove' | 'set_expiration' | 'expire_now';
  days?: number;
  expiresAt?: string | null;
  reason: string;
}) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/plan/days`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function grantAdminUserTrial(uid: string, data: { planId?: PlanId; days: number; reason: string }) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/trial`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function grantAdminUserLifetime(uid: string, data: { planId: PlanId; special?: boolean; reason: string }) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/lifetime`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function suspendAdminUser(uid: string, reason: string) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function reactivateAdminUser(uid: string, reason: string) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function addAdminUserNote(uid: string, note: string) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function banAdminUser(uid: string, data: {
  reason?: string;
  duration: 'permanent' | '1d' | '7d' | '30d' | 'custom';
  banExpiresAt?: string | null;
  confirmSelfBan?: boolean;
}) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/ban`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function unbanAdminUser(uid: string) {
  return apiRequest<UserAdminDetails>(`/api/admin/users/${encodeURIComponent(uid)}/unban`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
