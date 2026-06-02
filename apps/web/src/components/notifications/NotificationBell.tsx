import { useMemo, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CheckCheck,
  CreditCard,
  Info,
  Layers,
  LifeBuoy,
  Shield,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import {
  archiveNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from '@/components/ui/Toast';
import type { AppNotification, NotificationCategory } from '@/types';

const categoryLabel: Record<NotificationCategory, string> = {
  support: 'Suporte',
  billing: 'Pagamento',
  video: 'Video',
  event: 'Evento',
  template: 'Template',
  system: 'Sistema',
  admin: 'Admin',
};

const categoryIcon: Record<NotificationCategory, typeof Info> = {
  support: LifeBuoy,
  billing: CreditCard,
  video: Video,
  event: Calendar,
  template: Layers,
  system: Info,
  admin: Shield,
};

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function NotificationItem({
  notification,
  onOpen,
  onArchive,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => Promise<void> | void;
  onArchive: (notification: AppNotification) => Promise<void> | void;
}) {
  const Icon = categoryIcon[notification.category] || Info;
  const unread = !notification.readAt;

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void onOpen(notification);
  }

  function handleArchive(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void onArchive(notification);
  }

  return (
    <div className={`group grid grid-cols-[auto_1fr_auto] gap-3 rounded-2xl border p-3 transition-all ${
      unread
        ? 'border-brand-300/35 bg-[#1b2240]'
        : 'border-white/[0.08] bg-[#151821] hover:bg-[#191d28]'
    }`}>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-[#222738] text-white/68 transition-colors hover:text-white"
        aria-label={`Abrir notificacao ${notification.title}`}
      >
        <Icon className="h-4 w-4" />
      </button>

      <button type="button" onClick={handleOpen} className="min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold text-white">{notification.title}</p>
          {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/48">{notification.body}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-white/36">
          <span>{categoryLabel[notification.category] || notification.category}</span>
          <span>-</span>
          <span>{formatRelative(notification.createdAt)}</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-white/68">Visualizar</span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleArchive}
        aria-label="Arquivar notificacao"
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/28 opacity-100 transition-all hover:bg-red-500/12 hover:text-red-200 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function NotificationBell({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, setNotifications, markReadLocal, markAllReadLocal, archiveLocal } = useNotificationStore();
  const latestNotifications = useMemo(() => notifications.slice(0, 12), [notifications]);
  const canUsePortal = typeof document !== 'undefined';

  function stopActionEvent(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function refreshNotifications() {
    const result = await listNotifications({ limit: 60 });
    setNotifications(result.notifications, result.unreadCount);
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      markReadLocal(notification.id);
      markNotificationRead(notification.id).catch(() => undefined);
    }

    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function handleMarkAllRead(event: MouseEvent<HTMLButtonElement>) {
    stopActionEvent(event);
    if (unreadCount === 0) {
      toast.info('Todas as notificacoes ja estao lidas.');
      return;
    }

    markAllReadLocal();
    try {
      await markAllNotificationsRead();
      await refreshNotifications();
      toast.success('Notificacoes marcadas como lidas.');
    } catch {
      toast.error('Nao foi possivel marcar notificacoes.');
    }
  }

  async function handleArchive(notification: AppNotification) {
    archiveLocal(notification.id);
    try {
      await archiveNotification(notification.id);
    } catch {
      toast.error('Nao foi possivel arquivar.');
    }
  }

  function handleClose(event: MouseEvent<HTMLButtonElement>) {
    stopActionEvent(event);
    setOpen(false);
  }

  const panel = open ? (
    <div
      className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.5rem)+5.8rem)] z-[110] mx-auto max-w-md rounded-[26px] border border-white/[0.12] bg-[#10131d] p-2 shadow-2xl shadow-black/70 lg:inset-x-auto lg:bottom-4 lg:left-[276px] lg:w-[390px] lg:max-w-none"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="Notificacoes"
    >
      <div className="flex items-center justify-between gap-3 px-2 py-2">
        <div>
          <h2 className="text-sm font-black text-white">Notificacoes</h2>
          <p className="text-xs text-white/42">
            {unreadCount > 0 ? `${unreadCount} nao lida(s)` : 'Tudo em dia'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/62 transition-colors hover:bg-white/[0.09] hover:text-white"
            aria-label="Marcar todas como lidas"
            title="Marcar todas como lidas"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/62 transition-colors hover:bg-white/[0.09] hover:text-white"
            aria-label="Fechar notificacoes"
            title="Fechar notificacoes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(62vh,440px)] space-y-2 overflow-y-auto px-1 pb-1">
        {loading && latestNotifications.length === 0 ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-[#171b25] six3-shimmer" />
            ))}
          </div>
        ) : latestNotifications.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#151821] px-4 py-8 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-sm font-bold text-white/72">Sem notificacoes</p>
            <p className="mt-1 text-xs text-white/38">Avisos importantes vao aparecer aqui.</p>
          </div>
        ) : latestNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onOpen={openNotification}
            onArchive={handleArchive}
          />
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Notificacoes"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/55 transition-colors hover:bg-white/[0.09] hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white ring-2 ring-[#0e1016]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {canUsePortal && panel ? createPortal(panel, document.body) : panel}
    </div>
  );
}
