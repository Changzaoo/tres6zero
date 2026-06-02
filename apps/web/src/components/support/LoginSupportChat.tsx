import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, LifeBuoy, MessageCircle, Send, X } from 'lucide-react';
import {
  createAnonymousSupportConversation,
  getAnonymousSupportMessages,
  listAnonymousSupportConversations,
  sendAnonymousSupportMessage,
} from '@/services/supportService';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { SupportConversation, SupportMessage } from '@/types';

const VISITOR_KEY = 'six3.support.visitorId';
const CACHE_PREFIX = 'six3.support.loginCache.';
const defaultSubject = 'Problema para entrar na conta';
const supportSubjectOptions = [
  defaultSubject,
  'Esqueci minha senha',
  'Pagamento ou assinatura',
  'Conta bloqueada por dispositivo',
  'Nao recebi o e-mail de recuperacao',
  'Problema para criar conta',
  'Erro ao gravar ou enviar video',
  'Outro assunto',
];

type LoginSupportCache = {
  conversationId?: string;
  messages: SupportMessage[];
  subject?: string;
  savedAt: number;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function randomId(prefix: string) {
  if (!isBrowser()) return `${prefix}-server`;
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function getVisitorId() {
  if (!isBrowser()) return 'anonymous-server';
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const visitorId = randomId('anon');
  window.localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

function cacheKey(visitorId: string) {
  return `${CACHE_PREFIX}${visitorId}`;
}

function readCache(visitorId: string): LoginSupportCache | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(visitorId));
    return raw ? JSON.parse(raw) as LoginSupportCache : null;
  } catch {
    return null;
  }
}

function writeCache(visitorId: string, cache: LoginSupportCache) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(cacheKey(visitorId), JSON.stringify(cache));
  } catch {
    // The chat still works online if local storage is unavailable.
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function localMessage(visitorId: string, body: string, pending = true): SupportMessage {
  const now = new Date().toISOString();
  return {
    id: randomId('local-msg'),
    localId: randomId('pending'),
    conversationId: '',
    senderUid: visitorId,
    senderRole: 'anonymous',
    senderName: 'Anonimo',
    body,
    createdAt: now,
    pending,
  };
}

export function LoginSupportChat({ emailHint: _emailHint = '' }: { emailHint?: string }) {
  const [open, setOpen] = useState(false);
  const [visitorId] = useState(() => getVisitorId());
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shortVisitor = useMemo(() => visitorId.slice(-6).toUpperCase(), [visitorId]);

  useEffect(() => {
    const cached = readCache(visitorId);
    if (cached) {
      setMessages(cached.messages || []);
      setSubject(cached.subject || defaultSubject);
    }
  }, [visitorId]);

  useEffect(() => {
    writeCache(visitorId, {
      conversationId: conversation?.id,
      messages,
      subject,
      savedAt: Date.now(),
    });
  }, [conversation?.id, messages, subject, visitorId]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function loadRemoteConversation() {
    setLoading(true);
    try {
      const cached = readCache(visitorId);
      const { conversations } = await listAnonymousSupportConversations(visitorId);
      const selected = conversations.find((item) => item.id === cached?.conversationId) || conversations[0];
      if (!selected) return;

      setConversation(selected);
      setSubject(selected.subject || subject);
      const loaded = await getAnonymousSupportMessages(selected.id, visitorId);
      setConversation(loaded.conversation);
      setMessages(loaded.messages);
    } catch {
      if (messages.length === 0) toast.error('Nao foi possivel carregar o suporte agora.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadRemoteConversation();
    const interval = window.setInterval(() => {
      const conversationId = conversation?.id || readCache(visitorId)?.conversationId;
      if (conversationId) {
        getAnonymousSupportMessages(conversationId, visitorId)
          .then(({ conversation: nextConversation, messages: nextMessages }) => {
            setConversation(nextConversation);
            setMessages(nextMessages);
          })
          .catch(() => undefined);
      }
    }, 12000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visitorId]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    setDraft('');
    setSending(true);

    if (!conversation) {
      const pendingMessage = localMessage(visitorId, message);
      setMessages((current) => [...current, pendingMessage]);
      try {
        const { conversation: created } = await createAnonymousSupportConversation({
          visitorId,
          subject: subject.trim() || defaultSubject,
          message,
          userAgent: isBrowser() ? window.navigator.userAgent : undefined,
          pageUrl: isBrowser() ? window.location.href : undefined,
        });
        setConversation(created);
        const loaded = await getAnonymousSupportMessages(created.id, visitorId);
        setConversation(loaded.conversation);
        setMessages(loaded.messages);
        toast.success('Mensagem enviada ao suporte.');
      } catch {
        toast.error('Mensagem salva no navegador. Tente enviar novamente quando a internet voltar.');
      } finally {
        setSending(false);
      }
      return;
    }

    const pendingMessage = { ...localMessage(visitorId, message), conversationId: conversation.id };
    setMessages((current) => [...current, pendingMessage]);
    try {
      const { message: sent } = await sendAnonymousSupportMessage(conversation.id, visitorId, message);
      setMessages((current) => current.map((item) => item.id === pendingMessage.id ? sent : item));
    } catch {
      toast.error('Mensagem salva no navegador. Tente enviar novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/[0.08] hover:text-white"
      >
        <LifeBuoy className="h-4 w-4" />
        Entrar em contato com suporte
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-[min(92vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#101218] shadow-2xl shadow-black/60 sm:rounded-[28px]">
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">Suporte SIX3</p>
                <p className="truncate text-xs text-white/40">Atendimento anonimo #{shortVisitor}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar suporte"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!conversation && (
              <div className="border-b border-white/10 bg-yellow-400/[0.055] px-4 py-3">
                <div className="flex gap-2 text-xs leading-relaxed text-yellow-50/78">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" />
                  <span>Voce sera identificado como anonimo. O suporte pode pedir o e-mail da conta dentro da conversa se precisar.</span>
                </div>
                <div className="mt-3">
                  <select
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    aria-label="Assunto do suporte"
                    className="h-10 w-full rounded-full border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-brand-300/60"
                  >
                    {supportSubjectOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#101218] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {loading && messages.length === 0 ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-white/5" />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="mb-3 h-10 w-10 text-white/20" />
                  <p className="text-sm font-semibold text-white">Como podemos ajudar?</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/40">
                    Escolha o assunto e descreva o erro que aparece ou o que voce tentou fazer.
                  </p>
                </div>
              ) : messages.map((message) => {
                const fromAdmin = message.senderRole === 'admin';
                return (
                  <div key={message.id} className={`flex ${fromAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[82%] rounded-[22px] px-4 py-3 ${
                      fromAdmin ? 'bg-white/[0.075] text-white/86' : 'bg-brand-500/24 text-white'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                      <p className="mt-2 text-[11px] text-white/34">
                        {message.pending ? 'Salvo localmente' : `${message.senderName} - ${formatTime(message.createdAt)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="border-t border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-end gap-2 rounded-[24px] border border-white/10 bg-black/25 p-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={1}
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-white/28 outline-none"
                  placeholder="Escreva sua mensagem..."
                />
                <Button type="submit" loading={sending} size="sm" className="h-10 shrink-0 rounded-full px-4" icon={<Send className="h-4 w-4" />}>
                  Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
