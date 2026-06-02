import { collection, addDoc, updateDoc, getDocs, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppMusic } from '@/types';

const COLL = 'music';

export async function createMusic(data: Omit<AppMusic, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppMusic> {
  const now = new Date().toISOString();
  const music = { ...data, createdAt: now, updatedAt: now };
  const ref = await addDoc(collection(db, COLL), music);
  return { ...music, id: ref.id };
}

export async function getUserMusic(ownerId: string): Promise<AppMusic[]> {
  const q = query(collection(db, COLL), where('ownerId', '==', ownerId), where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppMusic));
}

export async function updateMusic(id: string, data: Partial<AppMusic>) {
  await updateDoc(doc(db, COLL, id), { ...data, updatedAt: new Date().toISOString() });
}
