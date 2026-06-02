import { apiRequest } from '@/services/authService';
import type { SupportConversation, SupportMessage } from '@/types';

type ConversationResponse = {
  conversation: SupportConversation;
};

type ConversationsResponse = {
  conversations: SupportConversation[];
};

type MessagesResponse = {
  conversation: SupportConversation;
  messages: SupportMessage[];
};

type MessageResponse = {
  message: SupportMessage;
};

export function listSupportConversations() {
  return apiRequest<ConversationsResponse>('/api/support/conversations');
}

export function createSupportConversation(data: { email: string; subject: string; message: string }) {
  return apiRequest<ConversationResponse>('/api/support/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getSupportMessages(conversationId: string) {
  return apiRequest<MessagesResponse>(`/api/support/conversations/${conversationId}/messages`);
}

export function sendSupportMessage(conversationId: string, message: string) {
  return apiRequest<MessageResponse>(`/api/support/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function listAdminSupportConversations() {
  return apiRequest<ConversationsResponse>('/api/support/admin/conversations');
}

export function getAdminSupportMessages(conversationId: string) {
  return apiRequest<MessagesResponse>(`/api/support/admin/conversations/${conversationId}/messages`);
}

export function sendAdminSupportMessage(conversationId: string, message: string) {
  return apiRequest<MessageResponse>(`/api/support/admin/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
