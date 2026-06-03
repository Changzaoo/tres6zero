import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, LifeBuoy, Mail, Search, Send, UserRound, X } from 'lucide-react';
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

const anonymousQuickReplies = [
  'Para localizar sua conta, me envie o e-mail usado no cadastro e, se possivel, um print do erro que aparece no login.',
  'Voce consegue confirmar se tentou entrar com Google/Apple ou com e-mail e senha? Isso ajuda a localizar o metodo correto.',
  'Vou te orientar: primeiro confira se o e-mail esta sem espacos, depois use "Esqueci a senha". Se ainda falhar, me envie o horario aproximado da tentativa.',
  'Recebi seu chamado como anonimo. Assim que voce informar o e-mail da conta, eu verifico cadastro, assinatura e possivel bloqueio de dispositivo.',
];

export function AdminSupportPanel() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [operationalOpen, setOperationalOpen] = useState(false);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );
  const isAnonymous = selected?.accessLevel === 'anonymous';

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

  useEffect(() => {
    if (isAnonymous) setOperationalOpen(true);
  }, [isAnonymous, selectedId]);

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;

    setSending(true);
    try {
      const { message } = await sendAdminSupportMessage(selectedId, reply);
      setMessages((current) => [...current, message]);
      setReply('');
      await refreshConversations();
      toast.success('Resposta enviada ao usuario.');
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
              <div className="mt-1 flex items-center gap-1.5">
                {conversation.accessLevel === 'anonymous' && (
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold text-yellow-100">
                    anonimo
                  </span>
                )}
                <p className="min-w-0 truncate text-xs text-white/45">{conversation.userEmail}</p>
              </div>
              <p className="mt-1 truncate text-xs text-white/35">{conversation.lastMessagePreview}</p>
            </button>
          ))}
        </div>

        <div className="min-h-[26rem] rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          {selected ? (
            <div className="flex h-full min-h-[26rem] flex-col">
              <div className="border-b border-white/10 pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{selected.subject}</h3>
                    <p className="text-xs text-white/40">{selected.userName} - {selected.userEmail}</p>
                    {selected.visitorId && <p className="mt-1 text-[11px] text-white/28">Visitor ID: {selected.visitorId}</p>}
                  </div>
                  {isAnonymous && (
                    <button
                      type="button"
                      onClick={() => setOperationalOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-100 transition hover:bg-yellow-400/15"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Processo operacional
                    </button>
                  )}
                </div>
              </div>

              {isAnonymous && (
                <div className="mt-3 rounded-2xl border border-yellow-300/15 bg-yellow-400/[0.055] p-3">
                  <div className="flex gap-2 text-xs leading-relaxed text-yellow-50/75">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" />
                    <span>Conversa aberta sem login. Identifique o e-mail antes de discutir dados de assinatura, pagamentos ou conta.</span>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {messages.map((message) => {
                  const isStaff = message.senderRole === 'admin' || message.senderRole === 'support';
                  return (
                    <div key={message.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[84%] rounded-2xl px-4 py-3 ${isStaff ? 'bg-brand-500/20 text-white' : 'bg-white/[0.065] text-white/82'}`}>
                        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                        <p className="mt-2 text-[11px] text-white/35">{message.senderName} - {formatDate(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isAnonymous && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {anonymousQuickReplies.slice(0, 2).map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setReply(text)}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-white/55 transition hover:border-brand-300/30 hover:text-white"
                    >
                      {text.slice(0, 48)}...
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleReply} className="flex gap-2 border-t border-white/10 pt-4">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={2}
                  className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-400/70 focus:outline-none"
                  placeholder="Responder ao usuario..."
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

      {operationalOpen && selected && isAnonymous && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#101218] p-5 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/12 text-yellow-100 ring-1 ring-yellow-300/20">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">Processo operacional para anonimo</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/45">
                  Use este fluxo para identificar a pessoa sem expor dados sensiveis antes da confirmacao.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOperationalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Identificar', 'Peça e-mail usado no cadastro, nome da empresa e print do erro.', UserRound],
                ['Checar conta', 'Se necessario, acione um admin para conferir UID, plano e status.', Search],
                ['Validar seguranca', 'Nao informe dados privados enquanto a pessoa nao provar controle do e-mail.', CheckCircle2],
                ['Resolver acesso', 'Oriente redefinicao de senha, metodo correto de login e dispositivos conectados.', Mail],
              ].map(([title, description, Icon]) => (
                <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                    <Icon className="h-4 w-4 text-brand-300" />
                    {title as string}
                  </div>
                  <p className="text-xs leading-relaxed text-white/45">{description as string}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/35">Respostas rapidas</p>
              <div className="grid gap-2">
                {anonymousQuickReplies.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => {
                      setReply(text);
                      setOperationalOpen(false);
                    }}
                    className="rounded-2xl border border-white/10 bg-black/18 px-3 py-2 text-left text-xs leading-relaxed text-white/62 transition hover:border-brand-300/25 hover:bg-brand-500/10 hover:text-white"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
