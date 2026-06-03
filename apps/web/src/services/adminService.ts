import { apiRequest } from '@/services/authService';
import type { AdminOverview } from '@/types';

export function getAdminOverview() {
  return apiRequest<AdminOverview>('/api/admin/overview');
}
