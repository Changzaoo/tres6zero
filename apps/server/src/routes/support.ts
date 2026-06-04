import { Router } from 'express';
import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAuthenticatedUser, requireSupportStaff } from './auth';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createNotification, createSupportStaffNotification } from '../services/notifications';

export const supportRouter = Router();

const conversationSchema = z.object({
  email: z.string().email().optional(),
  subject: z.string().min(3).max(160),
  message: z.string().min(1).max(5000),
});

const anonymousConversationSchema = conversationSchema.extend({
  visitorId: z.string().min(16).max(96).regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().min(2).max(120).optional(),
  userAgent: z.string().max(500).optional(),
  pageUrl: z.string().max(500).optional(),
});

const messageSchema = z.object({
  message: z.string().min(1).max(5000),
});

const adminConversationSchema = z.object({
  ownerUid: z.string().min(1).max(128).regex(/^[^/]+$/),
  subject: z.string().trim().min(3).max(160).optional(),
  message: z.string().trim().min(1).max(5000),
});

const anonymousMessageSchema = messageSchema.extend({
  visitorId: z.string().min(16).max(96).regex(/^[a-zA-Z0-9._-]+$/),
});

type RecordData = Record<string, unknown>;

function getDb() {
  const db = getFirebaseAdminFirestore();
  if (!db) {
    const err = new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return db;
}

function supportError(message: string, status: number): never {
  const err = new Error(message);
  (err as any).status = status;
  (err as any).code = message;
  throw err;
}

function nowIso() {
  return new Date().toISOString();
}

function preview(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isoFromValue(value: unknown, fallback = '') {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function roleFromAuthAndStored(authUser: UserRecord | null | undefined, stored: RecordData) {
  const claims = authUser?.customClaims || {};
  if (claims.role === 'admin' || stored.role === 'admin') return 'admin';
  if (claims.role === 'support' || stored.role === 'support') return 'support';
  return 'user';
}

function supportUserSummary(authUser: UserRecord | null | undefined, stored: RecordData, uid: string) {
  const claims = authUser?.customClaims || {};
  return {
    uid,
    name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuário')),
    email: authUser?.email || stringValue(stored.email),
    role: roleFromAuthAndStored(authUser, stored),
    disabled: Boolean(authUser?.disabled),
    emailVerified: Boolean(authUser?.emailVerified),
    subscriptionStatus: stringOrNull(claims.subscriptionStatus) || stringOrNull(stored.subscriptionStatus),
    planId: stringOrNull(claims.planId) || stringOrNull(stored.planId),
    companyName: stringValue(stored.companyName),
    avatarUrl: stringValue(stored.avatarUrl),
    currentPeriodEnd: stringOrNull(claims.currentPeriodEnd) || stringOrNull(stored.currentPeriodEnd),
    createdAt: authUser?.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : isoFromValue(stored.createdAt, ''),
    lastSignInAt: authUser?.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toISOString() : null,
  };
}

async function listAuthUsers() {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return [];

  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < 5000);

  return users;
}

async function listSupportUsers() {
  const db = getDb();
  const [authUsers, storedSnap] = await Promise.all([
    listAuthUsers(),
    db.collection('users').get(),
  ]);

  const authMap = new Map(authUsers.map((user) => [user.uid, user]));
  const storedMap = new Map(storedSnap.docs.map((doc) => [doc.id, doc.data() as RecordData]));
  const ids = new Set<string>([...authMap.keys(), ...storedMap.keys()]);

  return [...ids]
    .map((uid) => supportUserSummary(authMap.get(uid), storedMap.get(uid) || {}, uid))
    .sort((a, b) => {
      const bDate = Date.parse(b.lastSignInAt || b.createdAt || '');
      const aDate = Date.parse(a.lastSignInAt || a.createdAt || '');
      return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
    });
}

async function loadSupportUser(uid: string) {
  const db = getDb();
  const adminAuth = getFirebaseAdminAuth();
  const [authUser, storedSnap] = await Promise.all([
    adminAuth ? adminAuth.getUser(uid).catch(() => null) : Promise.resolve(null),
    db.collection('users').doc(uid).get(),
  ]);

  if (!authUser && !storedSnap.exists) supportError('SUPPORT_USER_NOT_FOUND', 404);

  return supportUserSummary(authUser, storedSnap.exists ? storedSnap.data() as RecordData : {}, uid);
}

function conversationFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ownerUid: data.ownerUid || '',
    visitorId: data.visitorId || '',
    accessLevel: data.accessLevel || 'authenticated',
    source: data.source || 'app',
    userName: data.userName || 'Usuário',
    userEmail: data.userEmail || '',
    contactEmail: data.contactEmail || data.userEmail || '',
    subject: data.subject || '',
    status: data.status || 'open',
    lastMessagePreview: data.lastMessagePreview || '',
    lastMessageAt: data.lastMessageAt || data.createdAt || nowIso(),
    unreadForAdmin: Number(data.unreadForAdmin || 0),
    unreadForUser: Number(data.unreadForUser || 0),
    createdAt: data.createdAt || nowIso(),
    updatedAt: data.updatedAt || nowIso(),
  };
}

function messageFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    conversationId: data.conversationId || '',
    senderUid: data.senderUid || '',
    senderRole: data.senderRole || 'user',
    senderName: data.senderName || 'Usuário',
    body: data.body || '',
    createdAt: data.createdAt || nowIso(),
  };
}

async function getConversation(id: string) {
  const db = getDb();
  const snap = await db.collection('supportConversations').doc(id).get();
  if (!snap.exists) supportError('SUPPORT_CONVERSATION_NOT_FOUND', 404);
  return { ref: snap.ref, data: conversationFromDoc(snap) };
}

async function listMessages(conversationId: string) {
  const db = getDb();
  const snap = await db
    .collection('supportConversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .get();

  return snap.docs.map(messageFromDoc);
}

function assertAnonymousConversation(conversation: ReturnType<typeof conversationFromDoc>, visitorId: string) {
  if (conversation.accessLevel !== 'anonymous' || conversation.visitorId !== visitorId) {
    supportError('FORBIDDEN', 403);
  }
}

supportRouter.get('/anonymous/conversations', async (req, res, next) => {
  try {
    const visitorId = z.string().min(16).max(96).regex(/^[a-zA-Z0-9._-]+$/).parse(req.query.visitorId);
    const db = getDb();
    const snap = await db.collection('supportConversations')
      .where('accessLevel', '==', 'anonymous')
      .where('visitorId', '==', visitorId)
      .get();
    const conversations = snap.docs
      .map(conversationFromDoc)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/anonymous/conversations', async (req, res, next) => {
  try {
    const data = anonymousConversationSchema.parse(req.body);
    const db = getDb();
    const createdAt = nowIso();
    const userName = data.name || 'Anônimo';
    const contactEmail = data.email || '';
    const conversationRef = db.collection('supportConversations').doc();
    const contextLines = [
      data.pageUrl ? `Página: ${data.pageUrl}` : '',
      data.userAgent ? `Dispositivo: ${data.userAgent}` : '',
    ].filter(Boolean);
    const body = contextLines.length ? `${data.message}\n\n---\n${contextLines.join('\n')}` : data.message;

    const conversation = {
      ownerUid: `anonymous:${data.visitorId}`,
      visitorId: data.visitorId,
      accessLevel: 'anonymous',
      source: 'login',
      userName,
      userEmail: contactEmail || 'anônimo',
      contactEmail,
      subject: data.subject,
      status: 'open',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForAdmin: 1,
      unreadForUser: 0,
      createdAt,
      updatedAt: createdAt,
    };

    await conversationRef.set(conversation);
    await conversationRef.collection('messages').add({
      conversationId: conversationRef.id,
      senderUid: data.visitorId,
      senderRole: 'anonymous',
      senderName: userName,
      body,
      createdAt,
    });

    await createSupportStaffNotification({
      category: 'support',
      title: 'Novo suporte anônimo',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/support-dashboard',
      priority: 'high',
      metadata: { conversationId: conversationRef.id, source: 'login' },
    }).catch((error) => console.warn('[notifications] support staff skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({ conversation: { id: conversationRef.id, ...conversation } });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/anonymous/conversations/:id/messages', async (req, res, next) => {
  try {
    const visitorId = z.string().min(16).max(96).regex(/^[a-zA-Z0-9._-]+$/).parse(req.query.visitorId);
    const { ref, data } = await getConversation(req.params.id);
    assertAnonymousConversation(data, visitorId);

    const messages = await listMessages(req.params.id);
    await ref.update({ unreadForUser: 0, updatedAt: nowIso() });

    res.json({ conversation: { ...data, unreadForUser: 0 }, messages });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/anonymous/conversations/:id/messages', async (req, res, next) => {
  try {
    const data = anonymousMessageSchema.parse(req.body);
    const { ref, data: conversation } = await getConversation(req.params.id);
    assertAnonymousConversation(conversation, data.visitorId);

    const createdAt = nowIso();
    const messageRef = await ref.collection('messages').add({
      conversationId: req.params.id,
      senderUid: data.visitorId,
      senderRole: 'anonymous',
      senderName: conversation.userName || 'Anônimo',
      body: data.message,
      createdAt,
    });

    await ref.update({
      status: 'open',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForAdmin: FieldValue.increment(1),
      updatedAt: createdAt,
    });

    await createSupportStaffNotification({
      category: 'support',
      title: 'Nova mensagem de suporte',
      body: `${conversation.userName || 'Anônimo'}: ${preview(data.message)}`,
      link: '/app/support-dashboard',
      priority: 'high',
      metadata: { conversationId: req.params.id, source: 'login' },
    }).catch((error) => console.warn('[notifications] support staff skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({
      message: messageFromDoc(await messageRef.get()),
    });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/conversations', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const db = getDb();
    const snap = await db.collection('supportConversations').where('ownerUid', '==', user.localId).get();
    const conversations = snap.docs
      .map(conversationFromDoc)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/conversations', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const data = conversationSchema.parse(req.body);
    const db = getDb();
    const createdAt = nowIso();
    const userEmail = data.email || user.email || '';
    const userName = user.displayName || user.email || 'Usuário';
    const conversationRef = db.collection('supportConversations').doc();

    const conversation = {
      ownerUid: user.localId,
      accessLevel: 'authenticated',
      source: 'app',
      userName,
      userEmail,
      contactEmail: userEmail,
      subject: data.subject,
      status: 'open',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForAdmin: 1,
      unreadForUser: 0,
      createdAt,
      updatedAt: createdAt,
    };

    await conversationRef.set(conversation);
    await conversationRef.collection('messages').add({
      conversationId: conversationRef.id,
      senderUid: user.localId,
      senderRole: 'user',
      senderName: userName,
      body: data.message,
      createdAt,
    });

    await createSupportStaffNotification({
      category: 'support',
      title: 'Novo chamado de suporte',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/support-dashboard',
      priority: 'high',
      metadata: { conversationId: conversationRef.id, ownerUid: user.localId },
    }).catch((error) => console.warn('[notifications] support staff skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({ conversation: { id: conversationRef.id, ...conversation } });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { ref, data } = await getConversation(req.params.id);
    if (data.ownerUid !== user.localId) supportError('FORBIDDEN', 403);

    const messages = await listMessages(req.params.id);
    await ref.update({ unreadForUser: 0, updatedAt: nowIso() });

    res.json({ conversation: { ...data, unreadForUser: 0 }, messages });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const data = messageSchema.parse(req.body);
    const { ref, data: conversation } = await getConversation(req.params.id);
    if (conversation.ownerUid !== user.localId) supportError('FORBIDDEN', 403);

    const createdAt = nowIso();
    const userName = user.displayName || user.email || 'Usuário';
    const messageRef = await ref.collection('messages').add({
      conversationId: req.params.id,
      senderUid: user.localId,
      senderRole: 'user',
      senderName: userName,
      body: data.message,
      createdAt,
    });

    await ref.update({
      status: 'open',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForAdmin: FieldValue.increment(1),
      updatedAt: createdAt,
    });

    await createSupportStaffNotification({
      category: 'support',
      title: 'Resposta do usuário no suporte',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/support-dashboard',
      priority: 'normal',
      metadata: { conversationId: req.params.id, ownerUid: user.localId },
    }).catch((error) => console.warn('[notifications] support staff skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({
      message: messageFromDoc(await messageRef.get()),
    });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/admin/conversations', requireSupportStaff, async (_req, res, next) => {
  try {
    const db = getDb();
    const snap = await db.collection('supportConversations').orderBy('lastMessageAt', 'desc').limit(100).get();
    res.json({ conversations: snap.docs.map(conversationFromDoc) });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/admin/users', requireSupportStaff, async (_req, res, next) => {
  try {
    res.json({ users: await listSupportUsers() });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/admin/conversations', requireSupportStaff, async (req, res, next) => {
  try {
    const adminUser = res.locals.user;
    const data = adminConversationSchema.parse(req.body || {});
    const target = await loadSupportUser(data.ownerUid);
    const db = getDb();
    const createdAt = nowIso();
    const subject = data.subject?.trim() || 'Mensagem do suporte';
    const senderRole = adminUser.role === 'support' ? 'support' : 'admin';
    const senderName = adminUser.name || (senderRole === 'support' ? 'Suporte' : 'Admin');
    const conversationRef = db.collection('supportConversations').doc();
    const conversation = {
      ownerUid: target.uid,
      accessLevel: 'authenticated',
      source: 'app',
      userName: target.name || target.email || 'Usuário',
      userEmail: target.email,
      contactEmail: target.email,
      subject,
      status: 'answered',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForAdmin: 0,
      unreadForUser: 1,
      createdAt,
      updatedAt: createdAt,
    };

    await conversationRef.set({
      ...conversation,
      _ts: FieldValue.serverTimestamp(),
    });

    const messageRef = await conversationRef.collection('messages').add({
      conversationId: conversationRef.id,
      senderUid: adminUser.uid,
      senderRole,
      senderName,
      body: data.message,
      createdAt,
    });

    await createNotification({
      recipientUid: target.uid,
      category: 'support',
      title: 'Nova mensagem do suporte',
      body: preview(data.message),
      link: '/app/support',
      priority: 'high',
      metadata: { conversationId: conversationRef.id, startedBy: adminUser.uid },
    }).catch((error) => console.warn('[notifications] support user skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({
      conversation: { id: conversationRef.id, ...conversation },
      message: messageFromDoc(await messageRef.get()),
    });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/admin/conversations/:id/messages', requireSupportStaff, async (req, res, next) => {
  try {
    const { ref, data } = await getConversation(req.params.id);
    const messages = await listMessages(req.params.id);
    await ref.update({ unreadForAdmin: 0, updatedAt: nowIso() });

    res.json({ conversation: { ...data, unreadForAdmin: 0 }, messages });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/admin/conversations/:id/messages', requireSupportStaff, async (req, res, next) => {
  try {
    const adminUser = res.locals.user;
    const data = messageSchema.parse(req.body);
    const { ref } = await getConversation(req.params.id);
    const createdAt = nowIso();

    const messageRef = await ref.collection('messages').add({
      conversationId: req.params.id,
      senderUid: adminUser.uid,
      senderRole: adminUser.role === 'support' ? 'support' : 'admin',
      senderName: adminUser.name || (adminUser.role === 'support' ? 'Suporte' : 'Admin'),
      body: data.message,
      createdAt,
    });

    await ref.update({
      status: 'answered',
      lastMessagePreview: preview(data.message),
      lastMessageAt: createdAt,
      unreadForUser: FieldValue.increment(1),
      updatedAt: createdAt,
    });

    const conversation = conversationFromDoc(await ref.get());
    await createNotification({
      recipientUid: conversation.ownerUid,
      category: 'support',
      title: 'Suporte respondeu',
      body: preview(data.message),
      link: '/app/support',
      priority: 'high',
      metadata: { conversationId: req.params.id },
    }).catch((error) => console.warn('[notifications] support user skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({
      message: messageFromDoc(await messageRef.get()),
    });
  } catch (error) {
    next(error);
  }
});
