import { collection, doc, addDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGeneratedTemplates } from '@/services/serverMediaService';
import type { AppTemplate } from '@/types';

const COLL = 'templates';

export async function seedTemplates() {
  return;
}

export async function createTemplate(data: Omit<AppTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppTemplate> {
  const now = new Date().toISOString();
  const template = { ...data, createdAt: now, updatedAt: now };
  const ref = await addDoc(collection(db, COLL), template);
  return { ...template, id: ref.id };
}

export async function getTemplates(): Promise<AppTemplate[]> {
  const [generated, stored] = await Promise.all([
    getGeneratedTemplates()
      .then((templates) => templates.map((template) => ({ ...template, source: 'generated' as const })))
      .catch((error) => {
        console.warn('[templates] Generated catalog unavailable:', error);
        return [] as AppTemplate[];
      }),
    getDocs(collection(db, COLL))
      .then((snap) => snap.docs.map(d => ({ id: d.id, ...d.data() } as AppTemplate)))
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
  await updateDoc(doc(db, COLL, id), { ...data, updatedAt: new Date().toISOString() });
}
