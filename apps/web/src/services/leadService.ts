import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lead } from '@/types';

const COLL = 'leads';

export async function createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> {
  const lead = { ...data, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, COLL), { ...lead, _ts: serverTimestamp() });
  return { ...lead, id: ref.id };
}

export async function getEventLeads(eventId: string): Promise<Lead[]> {
  const q = query(collection(db, COLL), where('eventId', '==', eventId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
}

export async function getAllLeads(): Promise<Lead[]> {
  const q = query(collection(db, COLL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
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
