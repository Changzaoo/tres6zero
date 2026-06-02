import { API_URL } from '@/config/api';
import { apiRequest } from '@/services/authService';
import type { Lead } from '@/types';

export async function createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> {
  const response = await fetch(`${API_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.code || 'LEAD_CREATE_FAILED');
  return payload.lead;
}

export async function getEventLeads(eventId: string): Promise<Lead[]> {
  const { leads } = await apiRequest<{ leads: Lead[] }>(`/api/leads/event/${encodeURIComponent(eventId)}`);
  return leads;
}

export async function getAllLeads(): Promise<Lead[]> {
  const { leads } = await apiRequest<{ leads: Lead[] }>('/api/leads');
  return leads;
}

export function leadsToCSV(leads: Lead[]): string {
  const header = 'name,phone,email,instagram,source,eventId,createdAt';
  const rows = leads.map(l =>
    [l.name, l.phone || '', l.email || '', l.instagram || '', l.source, l.eventId, l.createdAt].join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(content: string, filename = 'leads.csv') {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
