import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  getDoc, query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppEvent, EventStatus } from '@/types';
import { v4 as uuid } from 'uuid';

const COLL = 'events';

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

export async function createEvent(ownerId: string, data: Omit<AppEvent, 'id' | 'slug' | 'createdAt' | 'updatedAt'>): Promise<AppEvent> {
  const now = new Date().toISOString();
  const slug = slugify(data.name);
  const event: Omit<AppEvent, 'id'> = { ...data, slug, ownerId, createdAt: now, updatedAt: now };
  const ref = await addDoc(collection(db, COLL), { ...event, _ts: serverTimestamp() });
  return { ...event, id: ref.id };
}

export async function updateEvent(id: string, data: Partial<AppEvent>) {
  await updateDoc(doc(db, COLL, id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteEvent(id: string) {
  await deleteDoc(doc(db, COLL, id));
}

export async function getEvent(id: string): Promise<AppEvent | null> {
  const snap = await getDoc(doc(db, COLL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppEvent;
}

export async function getEventBySlug(slug: string): Promise<AppEvent | null> {
  const q = query(collection(db, COLL), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AppEvent;
}

export async function getUserEvents(ownerId: string): Promise<AppEvent[]> {
  const q = query(collection(db, COLL), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent));
}

export async function getAllEvents(): Promise<AppEvent[]> {
  const q = query(collection(db, COLL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent));
}

export async function duplicateEvent(id: string, ownerId: string): Promise<AppEvent> {
  const original = await getEvent(id);
  if (!original) throw new Error('Evento não encontrado');
  const { createdAt, updatedAt, id: _id, slug: _slug, ...rest } = original;
  return createEvent(ownerId, { ...rest, name: `${rest.name} (cópia)`, status: 'draft' });
}
