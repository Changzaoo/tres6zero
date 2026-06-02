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
  name: z.string().min(2, 'Nome obrigatorio'),
  clientName: z.string().min(2, 'Cliente obrigatorio'),
  date: z.string().min(1, 'Data obrigatoria'),
  location: z.string().min(2, 'Local obrigatorio'),
  type: z.enum(['wedding', 'birthday', 'graduation', 'corporate', 'club', 'inauguration', 'church', 'store', 'other']),
  status: z.enum(['draft', 'active', 'closed', 'archived']),
  description: z.string().optional(),
  profileHeadline: z.string().optional(),
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

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', type: 'other', leadCaptureEnabled: false, leadCaptureRequired: false },
  });

  useEffect(() => {
    if (!id) return;
    getEvent(id).then(e => {
      if (!e) return;
      reset(e as any);
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
    const payload = {
      ...data,
      coverUrl,
      avatarUrl,
      logoUrl: avatarUrl,
      mediaUrls,
      ownerId: user.uid,
      passwordEnabled: false,
      branding: { primaryColor: '#7c3aed', secondaryColor: '#4f46e5', logoUrl: avatarUrl },
    };

    try {
      if (isEdit) {
        await updateEvent(id!, payload);
        toast.success('Evento atualizado!');
      } else {
        const created = await createEvent(user.uid, payload);
        toast.success('Evento criado!');
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
              <Input label="Headline da pagina publica" placeholder="Ex: melhores momentos do evento" {...register('profileHeadline')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/70">Descricao</label>
                <textarea placeholder="Descricao do evento..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-brand-500/60 resize-none h-24"
                  {...register('description')} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Perfil publico</p>
              <div className="relative h-24 rounded-xl overflow-hidden bg-white/5">
                {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="h-full bg-gradient-brand opacity-50" />}
                {avatarUrl && <img src={avatarUrl} alt="" className="absolute left-3 -bottom-5 w-16 h-16 rounded-2xl object-cover border-2 border-surface bg-surface" />}
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
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Fotos e videos da pagina</p>
                <p className="text-xs text-white/40">Escolha midias de destaque para a pagina publica do cliente.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.1]">
                <Film className="w-4 h-4" /> Adicionar midias
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
          <Input label="Mensagem de compartilhamento" placeholder="Ex: Olha meu video 360!" {...register('shareMessage')} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/app/events')} className="flex-1 justify-center">Cancelar</Button>
            <Button type="submit" loading={isSubmitting || Boolean(assetLoading)} className="flex-1 justify-center">{isEdit ? 'Salvar alteracoes' : 'Criar evento'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
