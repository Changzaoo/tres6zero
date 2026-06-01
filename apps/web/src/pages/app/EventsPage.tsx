import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Users, MoreVertical, Copy, Archive, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getUserEvents, deleteEvent, duplicateEvent, updateEvent } from '@/services/eventService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { AppEvent } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusVariant: Record<string, any> = {
  active: 'success', draft: 'default', closed: 'warning', archived: 'danger'
};
const statusLabel: Record<string, string> = {
  active: 'Ativo', draft: 'Rascunho', closed: 'Encerrado', archived: 'Arquivado'
};

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserEvents(user.uid).then(setEvents).finally(() => setLoading(false));
  }, [user]);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteEvent(deleteId);
    setEvents(e => e.filter(ev => ev.id !== deleteId));
    setDeleteId(null);
    toast.success('Evento excluído.');
  }

  async function handleDuplicate(id: string) {
    if (!user) return;
    const copy = await duplicateEvent(id, user.uid);
    setEvents(e => [copy, ...e]);
    toast.success('Evento duplicado!');
    setMenuId(null);
  }

  async function handleArchive(id: string) {
    await updateEvent(id, { status: 'archived' });
    setEvents(e => e.map(ev => ev.id === id ? { ...ev, status: 'archived' } : ev));
    toast.success('Evento arquivado.');
    setMenuId(null);
  }

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-white/40 text-sm">{events.length} evento(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => navigate('/app/events/new')} icon={<Plus className="w-4 h-4" />}>Novo evento</Button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<Calendar className="w-8 h-8" />} title="Nenhum evento ainda"
          description="Crie seu primeiro evento para começar a usar a plataforma."
          action={{ label: 'Criar evento', onClick: () => navigate('/app/events/new') }} />
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-glass border border-white/[0.08] rounded-2xl p-5 flex items-center gap-4 hover:border-brand-500/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-brand-600/20">
                {event.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white">{event.name}</h3>
                  <Badge variant={statusVariant[event.status]}>{statusLabel[event.status]}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date ? format(new Date(event.date), "dd/MM/yyyy", { locale: ptBR }) : '—'}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location || '—'}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.clientName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate(`/app/events/${event.id}`)}>Ver</Button>
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === event.id ? null : event.id)}
                    className="p-2 rounded-lg hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuId === event.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-surface-50 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                      <button onClick={() => { navigate(`/app/events/${event.id}/edit`); setMenuId(null); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white">
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button onClick={() => handleDuplicate(event.id)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white">
                        <Copy className="w-4 h-4" /> Duplicar
                      </button>
                      <button onClick={() => handleArchive(event.id)}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white">
                        <Archive className="w-4 h-4" /> Arquivar
                      </button>
                      <button onClick={() => { setDeleteId(event.id); setMenuId(null); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.08]">
                        <Trash2 className="w-4 h-4" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir evento">
        <p className="text-white/70 mb-6">Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 justify-center" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1 justify-center" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  );
}
