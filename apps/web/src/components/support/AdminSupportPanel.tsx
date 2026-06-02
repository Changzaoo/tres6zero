import { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Send } from 'lucide-react';
import {
  getAdminSupportMessages,
  listAdminSupportConversations,
  sendAdminSupportMessage,
} from '@/services/supportService';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { SupportConversation, SupportMessage } from '@/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function AdminSupportPanel() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  async function refreshConversations(selectFirst = false) {
    const { conversations: items } = await listAdminSupportConversations();
    setConversations(items);
    if (selectFirst) setSelectedId((current) => current || items[0]?.id || '');
  }

  useEffect(() => {
    let mounted = true;
    listAdminSupportConversations()
      .then(({ conversations: items }) => {
        if (!mounted) return;
        setConversations(items);
        setSelectedId(items[0]?.id || '');
      })
      .catch(() => toast.error('Erro ao carregar mensagens de suporte.'))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let mounted = true;
    getAdminSupportMessages(selectedId)
      .then(({ conversation, messages: items }) => {
        if (!mounted) return;
        setMessages(items);
        setConversations((current) => current.map((item) => (item.id === conversation.id ? conversation : item)));
      })
      .catch(() => toast.error('Erro ao abrir conversa.'));

    return () => {
      mounted = false;
    };
  }, [selectedId]);

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;

    setSending(true);
    try {
      const { message } = await sendAdminSupportMessage(selectedId, reply);
      setMessages((current) => [...current, message]);
      setReply('');
      await refreshConversations();
      toast.success('Resposta enviada ao usuário.');
    } catch {
      toast.error('Erro ao responder suporte.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
      <div className="mb-4 flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-brand-400" />
        <h2 className="text-base font-semibold text-white">Mensagens de suporte</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
        <div className="space-y-2">
          {loading ? (
            [...Array(3)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />)
          ) : conversations.length === 0 ? (
            <p className="text-sm text-white/45">Nenhuma mensagem recebida ainda.</p>
          ) : conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                selectedId === conversation.id
                  ? 'border-brand-400/35 bg-brand-500/15'
                  : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">{conversation.subject}</p>
                {conversation.unreadForAdmin > 0 && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unreadForAdmin}</span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-white/45">{conversation.userEmail}</p>
              <p className="mt-1 truncate text-xs text-white/35">{conversation.lastMessagePreview}</p>
            </button>
          ))}
        </div>

        <div className="min-h-[26rem] rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          {selected ? (
            <div className="flex h-full min-h-[26rem] flex-col">
              <div className="border-b border-white/10 pb-3">
                <h3 className="font-semibold text-white">{selected.subject}</h3>
                <p className="text-xs text-white/40">{selected.userName} - {selected.userEmail}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {messages.map((message) => {
                  const isAdmin = message.senderRole === 'admin';
                  return (
                    <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${isAdmin ? 'bg-brand-500/20 text-white' : 'bg-white/[0.065] text-white/82'}`}>
                        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                        <p className="mt-2 text-[11px] text-white/35">{message.senderName} - {formatDate(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleReply} className="flex gap-2 border-t border-white/10 pt-4">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={2}
                  className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-400/70 focus:outline-none"
                  placeholder="Responder ao usuário..."
                />
                <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>
                  Enviar
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex h-full min-h-[26rem] items-center justify-center text-sm text-white/40">
              Selecione uma conversa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
