import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type LocalSupportConversation = {
  id: string;
  ownerUid: string;
  visitorId?: string;
  accessLevel: 'authenticated' | 'anonymous';
  source: string;
  userName: string;
  userEmail: string;
  contactEmail: string;
  subject: string;
  status: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadForAdmin: number;
  unreadForUser: number;
  createdAt: string;
  updatedAt: string;
};

export type LocalSupportMessage = {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: 'admin' | 'support' | 'user' | 'anonymous' | 'system';
  senderName: string;
  body: string;
  createdAt: string;
};

type StoreShape = {
  conversations: LocalSupportConversation[];
  messages: Record<string, LocalSupportMessage[]>;
};

function storePath() {
  if (process.env.SIX3_SUPPORT_STORE_PATH) return process.env.SIX3_SUPPORT_STORE_PATH;
  if (process.env.RENDER) return '/tmp/six3-support-store.json';
  return path.join(process.cwd(), 'data', 'support-store.json');
}

function emptyStore(): StoreShape {
  return { conversations: [], messages: {} };
}

async function readStore() {
  try {
    const raw = await fs.readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
    throw error;
  }
}

async function writeStore(store: StoreShape) {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2));
}

function byLastMessageDesc(a: LocalSupportConversation, b: LocalSupportConversation) {
  return b.lastMessageAt.localeCompare(a.lastMessageAt);
}

export async function listLocalSupportConversations(filter?: {
  ownerUid?: string;
  visitorId?: string;
  accessLevel?: 'authenticated' | 'anonymous';
  limit?: number;
}) {
  const store = await readStore();
  const conversations = store.conversations
    .filter((conversation) => !filter?.ownerUid || conversation.ownerUid === filter.ownerUid)
    .filter((conversation) => !filter?.visitorId || conversation.visitorId === filter.visitorId)
    .filter((conversation) => !filter?.accessLevel || conversation.accessLevel === filter.accessLevel)
    .sort(byLastMessageDesc);

  return typeof filter?.limit === 'number' ? conversations.slice(0, filter.limit) : conversations;
}

export async function getLocalSupportConversation(id: string) {
  const store = await readStore();
  return store.conversations.find((conversation) => conversation.id === id) || null;
}

export async function createLocalSupportConversation(
  conversation: Omit<LocalSupportConversation, 'id'>,
  message: Omit<LocalSupportMessage, 'id' | 'conversationId'>
) {
  const store = await readStore();
  const id = randomUUID();
  const savedConversation = { id, ...conversation };
  const savedMessage = { id: randomUUID(), conversationId: id, ...message };

  store.conversations.push(savedConversation);
  store.messages[id] = [savedMessage];
  await writeStore(store);

  return { conversation: savedConversation, message: savedMessage };
}

export async function listLocalSupportMessages(conversationId: string) {
  const store = await readStore();
  return [...(store.messages[conversationId] || [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addLocalSupportMessage(
  conversationId: string,
  message: Omit<LocalSupportMessage, 'id' | 'conversationId'>,
  patch: Partial<LocalSupportConversation>
) {
  const store = await readStore();
  const conversation = store.conversations.find((item) => item.id === conversationId);
  if (!conversation) return null;

  const savedMessage = { id: randomUUID(), conversationId, ...message };
  store.messages[conversationId] = [...(store.messages[conversationId] || []), savedMessage];
  Object.assign(conversation, patch);
  await writeStore(store);

  return savedMessage;
}

export async function updateLocalSupportConversation(id: string, patch: Partial<LocalSupportConversation>) {
  const store = await readStore();
  const conversation = store.conversations.find((item) => item.id === id);
  if (!conversation) return null;

  Object.assign(conversation, patch);
  await writeStore(store);
  return conversation;
}
