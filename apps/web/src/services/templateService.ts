import { collection, doc, addDoc, updateDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppTemplate } from '@/types';

const COLL = 'templates';

export const DEFAULT_TEMPLATES: Omit<AppTemplate, 'id'>[] = [
  { name: 'Neon Party', category: 'party', colors: { primary: '#ff00ff', secondary: '#00ffff' }, font: 'Inter', aspectRatio: '9:16', effects: ['neon', 'party'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Luxury Gold', category: 'premium', colors: { primary: '#d4a017', secondary: '#1a1a1a' }, font: 'Inter', aspectRatio: '9:16', effects: ['luxury', 'cinematic'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Wedding Clean', category: 'wedding', colors: { primary: '#f5f0e8', secondary: '#8b7355' }, font: 'Inter', aspectRatio: '9:16', effects: ['wedding', 'clean'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Birthday Pop', category: 'birthday', colors: { primary: '#ff6b6b', secondary: '#ffd93d' }, font: 'Inter', aspectRatio: '9:16', effects: ['birthday', 'party'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Corporate Black', category: 'corporate', colors: { primary: '#1a1a2e', secondary: '#4a90d9' }, font: 'Inter', aspectRatio: '16:9', effects: ['corporate', 'clean'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Tropical Brazil', category: 'party', colors: { primary: '#009c3b', secondary: '#ffdf00' }, font: 'Inter', aspectRatio: '9:16', effects: ['party', 'boomerang'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Viral TikTok', category: 'viral', colors: { primary: '#ff0050', secondary: '#00f2ea' }, font: 'Inter', aspectRatio: '9:16', effects: ['slowmotion', 'neon'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: 'Premium Glass', category: 'premium', colors: { primary: '#7c3aed', secondary: '#4f46e5' }, font: 'Inter', aspectRatio: '9:16', effects: ['cinematic', 'luxury'], isGlobal: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export async function seedTemplates() {
  const snap = await getDocs(query(collection(db, COLL), where('isGlobal', '==', true)));
  if (!snap.empty) return;
  for (const t of DEFAULT_TEMPLATES) {
    await addDoc(collection(db, COLL), t);
  }
}

export async function getTemplates(): Promise<AppTemplate[]> {
  const snap = await getDocs(collection(db, COLL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppTemplate));
}

export async function updateTemplate(id: string, data: Partial<AppTemplate>) {
  await updateDoc(doc(db, COLL, id), { ...data, updatedAt: new Date().toISOString() });
}
