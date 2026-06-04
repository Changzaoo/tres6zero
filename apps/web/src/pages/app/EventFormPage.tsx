import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Film, Image, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { createEvent, getEvent, updateEvent } from '@/services/eventService';
import { uploadImageToServer, uploadVideoToServer } from '@/services/serverMediaService';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  clientName: z.string().min(2, 'Cliente obrigatório'),
  date: z.string().min(1, 'Data obrigatoria'),
  location: z.string().min(2, 'Local obrigatório'),
  type: z.enum(['wedding', 'birthday', 'graduation', 'corporate', 'club', 'inauguration', 'church', 'store', 'other']),
  status: z.enum(['draft', 'active', 'closed', 'archived']),
  description: z.string().optional(),
  profileHeadline: z.string().optional(),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  leadCaptureEnabled: z.boolean(),
  leadCaptureRequired: z.boolean(),
  shareMessage: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const typeOptions = [
  { value: 'wedding', label: 'Casamento' }, { value: 'birthday', label: 'Aniversario' },
  { value: 'graduation', label: 'Formatura' }, { value: 'corporate', label: 'Corporativo' },
  { value: 'club', label: 'Balada' }, { value: 'inauguration', label: 'Inauguracao' },
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
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [assetLoading, setAssetLoading] = useState('');

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'draft',
      type: 'other',
      primaryColor: '#7c3aed',
      secondaryColor: '#4f46e5',
      leadCaptureEnabled: false,
      leadCaptureRequired: false,
    },
  });
  const primaryColor = watch('primaryColor') || '#7c3aed';
  const secondaryColor = watch('secondaryColor') || '#4f46e5';
  const previewGradient = {
    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
  };

  useEffect(() => {
    if (!id) return;
    getEvent(id).then(e => {
      if (!e) return;
      reset({
        name: e.name,
        clientName: e.clientName,
        date: e.date,
        location: e.location,
        type: e.type,
        status: e.status,
        description: e.description || '',
        profileHeadline: e.profileHeadline || '',
        primaryColor: e.branding?.primaryColor || '#7c3aed',
        secondaryColor: e.branding?.secondaryColor || '#4f46e5',
        leadCaptureEnabled: e.leadCaptureEnabled,
        leadCaptureRequired: e.leadCaptureRequired,
        shareMessage: e.shareMessage || '',
      });
      setCoverUrl(e.coverUrl || '');
      setAvatarUrl(e.avatarUrl || e.logoUrl || '');
      setMediaUrls(e.mediaUrls || []);
    });
  }, [id, reset]);

  async function uploadAsset(file: File, kind: 'cover' | 'avatar' | 'media') {
    setAssetLoading(kind);
    try {
      const isVideo = file.type.startsWith('video/');
      const uploaded = isVideo ? await uploadVideoToServer(file) : await uploadImageToServer(file);
      const url = uploaded.publicUrl || uploaded.imageUrl || uploaded.videoUrl;
      if (!url) throw new Error('UPLOAD_WITHOUT_URL');

      if (kind === 'cover') setCoverUrl(url);
      if (kind === 'avatar') setAvatarUrl(url);
      if (kind === 'media') setMediaUrls((current) => [...current, url]);
      toast.success('Arquivo enviado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar arquivo.');
    } finally {
      setAssetLoading('');
    }
  }

  function handleSingleUpload(kind: 'cover' | 'avatar') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) uploadAsset(file, kind);
    };
  }

  function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((file) => uploadAsset(file, 'media'));
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    const { primaryColor: nextPrimaryColor, secondaryColor: nextSecondaryColor, ...eventData } = data;
    const payload = {
      ...eventData,
      coverUrl,
      avatarUrl,
      logoUrl: avatarUrl,
      mediaUrls,
      ownerId: user.uid,
      passwordEnabled: false,
      branding: { primaryColor: nextPrimaryColor, secondaryColor: nextSecondaryColor, logoUrl: avatarUrl },
    };

    try {
      if (isEdit) {
        const updated = await updateEvent(id!, payload);
        if (!navigator.onLine || updated?.id?.startsWith('local_')) {
          toast.info('Evento salvo neste dispositivo. Ele será enviado quando a internet voltar.');
        } else {
          toast.success('Evento atualizado!');
        }
      } else {
        const created = await createEvent(user.uid, payload);
        if (!navigator.onLine || created.id.startsWith('local_')) {
          toast.info('Evento salvo neste dispositivo. Ele será enviado quando a internet voltar.');
        } else {
          toast.success('Evento criado!');
        }
        navigate(`/app/events/${created.id}`);
        return;
      }
      navigate(`/app/events/${id}`);
    } catch (error) {
      console.warn('[events] Save failed:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar evento.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/app/events')}>Voltar</Button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Editar evento' : 'Novo evento'}</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Nome do evento" placeholder="Ex: Casamento Silva" error={errors.name?.message} {...register('name')} />
            <Input label="Cliente" placeholder="Nome do cliente" error={errors.clientName?.message} {...register('clientName')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Data" type="date" error={errors.date?.message} {...register('date')} />
            <Input label="Local" placeholder="Salao, cidade..." error={errors.location?.message} {...register('location')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Controller name="type" control={control} render={({ field }) => (
              <Select label="Tipo de evento" options={typeOptions} {...field} error={errors.type?.message} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <Select label="Status" options={statusOptions} {...field} error={errors.status?.message} />
            )} />
          </div>

          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-4">
            <div className="space-y-3">
              <Input label="Headline da página pública" placeholder="Ex: melhores momentos do evento" {...register('profileHeadline')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/70">Descrição</label>
                <textarea placeholder="Descrição do evento..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-brand-500/60 resize-none h-24"
                  {...register('description')} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Perfil público</p>
              <div className="relative pb-7">
                <div className="h-24 overflow-hidden rounded-xl bg-white/5">
                  {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="h-full opacity-70" style={previewGradient} />}
                </div>
                <div
                  className="absolute bottom-0 left-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-gradient-brand text-lg font-black text-white shadow-xl"
                  style={!avatarUrl ? previewGradient : undefined}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : watch('name')?.charAt(0) || 'S'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-4">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]">
                  <Image className="w-4 h-4" /> Capa
                  <input type="file" accept="image/*" className="hidden" disabled={assetLoading === 'cover'} onChange={handleSingleUpload('cover')} />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]">
                  <Upload className="w-4 h-4" /> Avatar
                  <input type="file" accept="image/*" className="hidden" disabled={assetLoading === 'avatar'} onChange={handleSingleUpload('avatar')} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-white/55">Cor principal</span>
                  <input type="color" className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] p-1" {...register('primaryColor')} />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold text-white/55">Cor secundária</span>
                  <input type="color" className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] p-1" {...register('secondaryColor')} />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Fotos e vídeos da página</p>
                <p className="text-xs text-white/40">Escolha mídias de destaque para a página pública do cliente.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.1]">
                <Film className="w-4 h-4" /> Adicionar mídias
                <input type="file" multiple accept="image/*,video/*" className="hidden" disabled={assetLoading === 'media'} onChange={handleMediaUpload} />
              </label>
            </div>
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {mediaUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-black/30 border border-white/10">
                    {url.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                      <video src={url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => setMediaUrls((items) => items.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('leadCaptureEnabled')} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-white/70">Ativar captura de leads</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" {...register('leadCaptureRequired')} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-white/70">Captura de lead obrigatoria para download</span>
            </label>
          </div>
          <Input label="Mensagem de compartilhamento" placeholder="Ex: Olha meu vídeo 360!" {...register('shareMessage')} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/app/events')} className="flex-1 justify-center">Cancelar</Button>
            <Button type="submit" loading={isSubmitting || Boolean(assetLoading)} className="flex-1 justify-center">{isEdit ? 'Salvar alterações' : 'Criar evento'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
