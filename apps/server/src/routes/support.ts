import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAuthenticatedUser, requireAdmin } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createAdminNotification, createNotification } from '../services/notifications';

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

const anonymousMessageSchema = messageSchema.extend({
  visitorId: z.string().min(16).max(96).regex(/^[a-zA-Z0-9._-]+$/),
});

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

function conversationFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ownerUid: data.ownerUid || '',
    visitorId: data.visitorId || '',
    accessLevel: data.accessLevel || 'authenticated',
    source: data.source || 'app',
    userName: data.userName || 'Usuario',
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
    senderName: data.senderName || 'Usuario',
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
    const userName = data.name || 'Anonimo';
    const contactEmail = data.email || '';
    const conversationRef = db.collection('supportConversations').doc();
    const contextLines = [
      data.pageUrl ? `Pagina: ${data.pageUrl}` : '',
      data.userAgent ? `Dispositivo: ${data.userAgent}` : '',
    ].filter(Boolean);
    const body = contextLines.length ? `${data.message}\n\n---\n${contextLines.join('\n')}` : data.message;

    const conversation = {
      ownerUid: `anonymous:${data.visitorId}`,
      visitorId: data.visitorId,
      accessLevel: 'anonymous',
      source: 'login',
      userName,
      userEmail: contactEmail || 'anonimo',
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

    await createAdminNotification({
      category: 'support',
      title: 'Novo suporte anonimo',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/admin',
      priority: 'high',
      metadata: { conversationId: conversationRef.id, source: 'login' },
    }).catch((error) => console.warn('[notifications] support admin skipped:', error instanceof Error ? error.message : error));

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
      senderName: conversation.userName || 'Anonimo',
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

    await createAdminNotification({
      category: 'support',
      title: 'Nova mensagem de suporte',
      body: `${conversation.userName || 'Anonimo'}: ${preview(data.message)}`,
      link: '/app/admin',
      priority: 'high',
      metadata: { conversationId: req.params.id, source: 'login' },
    }).catch((error) => console.warn('[notifications] support admin skipped:', error instanceof Error ? error.message : error));

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
    const userName = user.displayName || user.email || 'Usuario';
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

    await createAdminNotification({
      category: 'support',
      title: 'Novo chamado de suporte',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/admin',
      priority: 'high',
      metadata: { conversationId: conversationRef.id, ownerUid: user.localId },
    }).catch((error) => console.warn('[notifications] support admin skipped:', error instanceof Error ? error.message : error));

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
    const userName = user.displayName || user.email || 'Usuario';
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

    await createAdminNotification({
      category: 'support',
      title: 'Resposta do usuario no suporte',
      body: `${userName}: ${preview(data.message)}`,
      link: '/app/admin',
      priority: 'normal',
      metadata: { conversationId: req.params.id, ownerUid: user.localId },
    }).catch((error) => console.warn('[notifications] support admin skipped:', error instanceof Error ? error.message : error));

    res.status(201).json({
      message: messageFromDoc(await messageRef.get()),
    });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/admin/conversations', requireAdmin, async (_req, res, next) => {
  try {
    const db = getDb();
    const snap = await db.collection('supportConversations').orderBy('lastMessageAt', 'desc').limit(100).get();
    res.json({ conversations: snap.docs.map(conversationFromDoc) });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/admin/conversations/:id/messages', requireAdmin, async (req, res, next) => {
  try {
    const { ref, data } = await getConversation(req.params.id);
    const messages = await listMessages(req.params.id);
    await ref.update({ unreadForAdmin: 0, updatedAt: nowIso() });

    res.json({ conversation: { ...data, unreadForAdmin: 0 }, messages });
  } catch (error) {
    next(error);
  }
});

supportRouter.post('/admin/conversations/:id/messages', requireAdmin, async (req, res, next) => {
  try {
    const adminUser = res.locals.user;
    const data = messageSchema.parse(req.body);
    const { ref } = await getConversation(req.params.id);
    const createdAt = nowIso();

    const messageRef = await ref.collection('messages').add({
      conversationId: req.params.id,
      senderUid: adminUser.uid,
      senderRole: 'admin',
      senderName: adminUser.name || 'Admin',
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
