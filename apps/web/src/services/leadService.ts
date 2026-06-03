import { API_URL } from '@/config/api';
import { apiRequest } from '@/services/authService';
import type { Lead } from '@/types';

export type CreateLeadInput = {
  eventId: string;
  videoId?: string;
  name?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  feedback?: string;
  visitorId?: string;
  acceptedTerms?: boolean;
  source?: string;
};

export async function createLead(data: CreateLeadInput): Promise<Lead> {
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
  const fields: (keyof Lead)[] = ['name', 'phone', 'email', 'instagram', 'feedback', 'source', 'eventId', 'videoId', 'visitorId', 'createdAt'];
  const header = fields.join(',');
  const rows = leads.map((lead) => fields.map((field) => csvEscape(lead[field])).join(','));
  return [header, ...rows].join('\n');
}

function csvEscape(value: unknown) {
  const text = String(value || '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCSV(content: string, filename = 'leads.csv') {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
