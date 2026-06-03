import { apiRequest } from '@/services/authService';
import type { AdminAuditLog, AdminOverview, AdminUserDevice, UserAdminDetails, UserLoginEvent } from '@/types';

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
