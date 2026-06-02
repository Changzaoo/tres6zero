import { apiRequest } from '@/services/authService';
import type { AppMusic } from '@/types';

export async function createMusic(data: Omit<AppMusic, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppMusic> {
  const { music } = await apiRequest<{ music: AppMusic }>('/api/templates/custom-music', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return music;
}

export async function getUserMusic(ownerId?: string): Promise<AppMusic[]> {
  if (!ownerId) return [];
  const { music } = await apiRequest<{ music: AppMusic[] }>('/api/templates/custom-music');
  return music;
}

export async function updateMusic(id: string, data: Partial<AppMusic>) {
  await apiRequest<{ music: AppMusic }>(`/api/templates/custom-music/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
