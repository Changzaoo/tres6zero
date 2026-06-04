import { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  createSupportConversation,
  getSupportMessages,
  listSupportConversations,
  sendSupportMessage,
} from '@/services/supportService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import type { SupportConversation, SupportMessage } from '@/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function SupportPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const accountEmail = user?.email || '';

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  useEffect(() => {
    let mounted = true;
    listSupportConversations()
      .then(({ conversations: items }) => {
        if (!mounted) return;
        setConversations(items);
        setSelectedId((current) => current || items[0]?.id || '');
      })
      .catch(() => toast.error('Erro ao carregar suporte.'))
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
    getSupportMessages(selectedId)
      .then(({ conversation, messages: items }) => {
        if (!mounted) return;
        setMessages(items);
        setConversations((current) => current.map((item) => (item.id === conversation.id ? conversation : item)));
      })
      .catch(() => toast.error('Erro ao carregar conversa.'));

    return () => {
      mounted = false;
    };
  }, [selectedId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!accountEmail) {
      toast.error('Não foi possível identificar o e-mail da conta.');
      return;
    }
    if (!subject || !newMessage) {
      toast.error('Preencha assunto e mensagem.');
      return;
    }

    setSubmitting(true);
    try {
      const { conversation } = await createSupportConversation({ email: accountEmail, subject, message: newMessage });
      setConversations((current) => [conversation, ...current]);
      setSelectedId(conversation.id);
      setSubject('');
      setNewMessage('');
      toast.success('Mensagem enviada ao suporte.');
    } catch {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;

    setSubmitting(true);
    try {
      const { message } = await sendSupportMessage(selectedId, reply);
      setMessages((current) => [...current, message]);
      setReply('');
      toast.success('Resposta enviada.');
    } catch {
      toast.error('Erro ao enviar resposta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Suporte</h1>
          <p className="text-sm text-white/40">Envie uma mensagem e acompanhe a resposta pelo app.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <LifeBuoy className="h-5 w-5 text-brand-400" />
            Novo contato
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Assunto" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex: Pagamento, acesso, vídeo..." />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Mensagem</label>
              <textarea
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Descreva o que aconteceu."
              />
            </div>
            <Button type="submit" loading={submitting} className="w-full justify-center" icon={<Send className="h-4 w-4" />}>
              Enviar ao suporte
            </Button>
          </form>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <MessageSquare className="h-5 w-5 text-brand-400" />
              Conversas
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-white/45">Nenhuma conversa ainda.</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
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
                      {conversation.unreadForUser > 0 && <span className="h-2 w-2 rounded-full bg-brand-400" />}
                    </div>
                    <p className="mt-1 truncate text-xs text-white/42">{conversation.lastMessagePreview}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            {selected ? (
              <div className="flex min-h-[30rem] flex-col">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-base font-semibold text-white">{selected.subject}</h2>
                  <p className="text-xs text-white/40">{selected.status === 'answered' ? 'Respondido' : 'Aberto'} - {formatDate(selected.lastMessageAt)}</p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  {messages.map((message) => {
                    const fromUser = message.senderRole === 'user';
                    return (
                      <div key={message.id} className={`flex ${fromUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${fromUser ? 'bg-brand-500/20 text-white' : 'bg-white/[0.065] text-white/82'}`}>
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
                    placeholder="Responder..."
                  />
                  <Button type="submit" loading={submitting} icon={<Send className="h-4 w-4" />}>
                    Enviar
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex min-h-[30rem] items-center justify-center text-sm text-white/42">
                Selecione uma conversa.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
