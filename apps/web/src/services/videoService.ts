import {
  collection, doc, addDoc, updateDoc, getDocs,
  getDoc, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppVideo, VideoStatus } from '@/types';

const COLL = 'videos';

export async function createVideo(data: Omit<AppVideo, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppVideo> {
  const now = new Date().toISOString();
  const video = { ...data, createdAt: now, updatedAt: now };
  const ref2 = await addDoc(collection(db, COLL), { ...video, _ts: serverTimestamp() });
  return { ...video, id: ref2.id };
}

export async function updateVideo(id: string, data: Partial<AppVideo>) {
  await updateDoc(doc(db, COLL, id), { ...data, updatedAt: new Date().toISOString() });
}

export async function getVideo(id: string): Promise<AppVideo | null> {
  const snap = await getDoc(doc(db, COLL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppVideo;
}

export async function getEventVideos(eventId: string): Promise<AppVideo[]> {
  const q = query(collection(db, COLL), where('eventId', '==', eventId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppVideo));
}

export async function getUserVideos(ownerId: string): Promise<AppVideo[]> {
  const q = query(collection(db, COLL), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppVideo));
}

export async function incrementVideoStat(id: string, field: 'views' | 'downloads' | 'shares') {
  const video = await getVideo(id);
  if (!video) return;
  await updateDoc(doc(db, COLL, id), { [field]: (video[field] || 0) + 1 });
}
