import { apiRequest } from '@/services/authService';
import { getGeneratedTemplates } from '@/services/serverMediaService';
import type { AppTemplate } from '@/types';

export async function seedTemplates() {
  return;
}

export async function createTemplate(data: Omit<AppTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppTemplate> {
  const { template } = await apiRequest<{ template: AppTemplate }>('/api/templates/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return template;
}

async function getCustomTemplates(userId?: string): Promise<AppTemplate[]> {
  if (!userId) return [];
  const { templates } = await apiRequest<{ templates: AppTemplate[] }>('/api/templates/custom');
  return templates.map((template) => ({ ...template, source: 'custom' as const }));
}

export async function getTemplates(userId?: string): Promise<AppTemplate[]> {
  const [generated, stored] = await Promise.all([
    getGeneratedTemplates()
      .then((templates) => templates.map((template) => ({ ...template, source: 'generated' as const })))
      .catch((error) => {
        console.warn('[templates] Generated catalog unavailable:', error);
        return [] as AppTemplate[];
      }),
    getCustomTemplates(userId)
      .catch((error) => {
        console.warn('[templates] Custom templates unavailable:', error);
        return [] as AppTemplate[];
      }),
  ]);

  const byId = new Map<string, AppTemplate>();
  [...stored, ...generated]
    .filter((template) => template.source !== 'default' && !template.id.startsWith('default-'))
    .forEach((template) => byId.set(template.id, template));
  return Array.from(byId.values());
}

export async function updateTemplate(id: string, data: Partial<AppTemplate>) {
  await apiRequest<{ template: AppTemplate }>(`/api/templates/custom/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
