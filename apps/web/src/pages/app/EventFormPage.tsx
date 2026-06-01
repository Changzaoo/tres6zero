import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { createEvent, getEvent, updateEvent } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  clientName: z.string().min(2, 'Cliente obrigatório'),
  date: z.string().min(1, 'Data obrigatória'),
  location: z.string().min(2, 'Local obrigatório'),
  type: z.enum(['wedding', 'birthday', 'graduation', 'corporate', 'club', 'inauguration', 'church', 'store', 'other']),
  status: z.enum(['draft', 'active', 'closed', 'archived']),
  description: z.string().optional(),
  leadCaptureEnabled: z.boolean(),
  leadCaptureRequired: z.boolean(),
  shareMessage: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const typeOptions = [
  { value: 'wedding', label: 'Casamento' }, { value: 'birthday', label: 'Aniversário' },
  { value: 'graduation', label: 'Formatura' }, { value: 'corporate', label: 'Corporativo' },
  { value: 'club', label: 'Balada' }, { value: 'inauguration', label: 'Inauguração' },
  { value: 'church', label: 'Igreja' }, { value: 'store', label: 'Loja' }, { value: 'other', label: 'Outro' },
];
const statusOptions = [
  { value: 'draft', label: 'Rascunho' }, { value: 'active', label: 'Ativo' },
  { value: 'closed', label: 'Encerrado' }, { value: 'archived', label: 'Arquivado' },
];

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', type: 'other', leadCaptureEnabled: false, leadCaptureRequired: false },
  });

  useEffect(() => {
    if (!id) return;
    getEvent(id).then(e => { if (e) reset(e as any); });
  }, [id]);

  async function onSubmit(data: FormData) {
    if (!user) return;
    try {
      if (isEdit) {
        await updateEvent(id!, data);
        toast.success('Evento atualizado!');
      } else {
        const created = await createEvent(user.uid, {
          ...data, ownerId: user.uid, passwordEnabled: false,
          branding: { primaryColor: '#7c3aed', secondaryColor: '#4f46e5' },
        });
        toast.success('Evento criado!');
        navigate(`/app/events/${created.id}`);
        return;
      }
      navigate(`/app/events/${id}`);
    } catch { toast.error('Erro ao salvar evento.'); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/app/events')}>Voltar</Button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Editar evento' : 'Novo evento'}</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Nome do evento" placeholder="Ex: Casamento Silva" error={errors.name?.message} {...register('name')} />
            <Input label="Cliente" placeholder="Nome do cliente" error={errors.clientName?.message} {...register('clientName')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Data" type="date" error={errors.date?.message} {...register('date')} />
            <Input label="Local" placeholder="Salão, cidade..." error={errors.location?.message} {...register('location')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Controller name="type" control={control} render={({ field }) => (
              <Select label="Tipo de evento" options={typeOptions} {...field} error={errors.type?.message} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <Select label="Status" options={statusOptions} {...field} error={errors.status?.message} />
            )} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Descrição</label>
            <textarea placeholder="Descrição do evento..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-brand-500/60 resize-none h-24"
              {...register('description')} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('leadCaptureEnabled')} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-white/70">Ativar captura de leads</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('leadCaptureRequired')} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-white/70">Captura de lead obrigatória para download</span>
            </label>
          </div>
          <Input label="Mensagem de compartilhamento" placeholder="Ex: Olha meu vídeo 360! 🎥✨" {...register('shareMessage')} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/app/events')} className="flex-1 justify-center">Cancelar</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1 justify-center">{isEdit ? 'Salvar alterações' : 'Criar evento'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
