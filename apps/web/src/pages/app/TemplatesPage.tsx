import { useEffect, useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { Database, Layers, Lock, Music2, Upload, Zap } from 'lucide-react';
import { getTemplates, createTemplate } from '@/services/templateService';
import { createMusic, getUserMusic } from '@/services/musicService';
import { uploadMusicToServer, uploadTemplateToServer, seedGeneratedTemplates } from '@/services/serverMediaService';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { hasFeature } from '@/config/plans';
import type { AppMusic, AppTemplate } from '@/types';

const INITIAL_TEMPLATE_COUNT = 32;
const TEMPLATE_BATCH_SIZE = 32;

function templateAspectRatio(aspectRatio: AppTemplate['aspectRatio']) {
  if (aspectRatio === '16:9') return '16 / 9';
  if (aspectRatio === '1:1') return '1 / 1';
  return '9 / 16';
}

function isLegacyGenericTemplate(template: AppTemplate) {
  return template.source === 'default' || template.id.startsWith('default-');
}

function mergeTemplates(templates: AppTemplate[]) {
  const byId = new Map<string, AppTemplate>();
  templates
    .filter((template) => !isLegacyGenericTemplate(template))
    .forEach((template) => byId.set(template.id, template));
  return Array.from(byId.values());
}

async function loadCatalog(userId?: string) {
  const [templateResult, musicResult] = await Promise.allSettled([
    getTemplates(),
    userId ? getUserMusic(userId) : Promise.resolve([] as AppMusic[]),
  ]);

  return {
    templates: templateResult.status === 'fulfilled' ? templateResult.value : [],
    music: musicResult.status === 'fulfilled' ? musicResult.value : [],
    templateError: templateResult.status === 'rejected' ? templateResult.reason : null,
    musicError: musicResult.status === 'rejected' ? musicResult.reason : null,
  };
}

function TemplateCard({
  template,
  activeMotionId,
  setActiveMotionId,
}: {
  template: AppTemplate;
  activeMotionId: string | null;
  setActiveMotionId: Dispatch<SetStateAction<string | null>>;
}) {
  const primary = template.colors?.primary || '#7c3aed';
  const secondary = template.colors?.secondary || '#00d4ff';
  const isMotionActive = Boolean(template.animationUrl && activeMotionId === template.id);

  return (
    <div
      className="group cursor-pointer animate-fade-in"
      onMouseEnter={() => template.animationUrl && setActiveMotionId(template.id)}
      onMouseLeave={() => template.animationUrl && setActiveMotionId(null)}
      onTouchStart={() => template.animationUrl && setActiveMotionId((current) => current === template.id ? null : template.id)}
    >
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] transition-all hover:border-brand-500/30">
        <div
          className="relative flex max-h-56 items-center justify-center overflow-hidden"
          style={{ aspectRatio: templateAspectRatio(template.aspectRatio), background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          <BrandWordmark className="text-3xl drop-shadow-lg" />
          {isMotionActive && template.animationUrl ? (
            <video
              src={template.animationUrl}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : template.overlayUrl ? (
            <img
              src={template.overlayUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white">Usar template</span>
          </div>
        </div>
        <div className="bg-surface-50 p-3">
          <p className="truncate text-sm font-semibold text-white">{template.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="purple">{template.category}</Badge>
            <span className="text-xs text-white/30">{template.aspectRatio}</span>
            {template.animationUrl && <span className="text-xs text-cyan-200/80">animado</span>}
            {template.source && <span className="text-xs text-white/30">{template.source}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(template.effects || []).slice(0, 2).map(effect => (
              <span key={effect} className="flex items-center gap-0.5 text-xs text-white/40">
                <Zap className="h-2.5 w-2.5" />{effect}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [music, setMusic] = useState<AppMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [musicProgress, setMusicProgress] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_TEMPLATE_COUNT);
  const [activeMotionId, setActiveMotionId] = useState<string | null>(null);

  const canUpload = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'custom_template_upload', isAdmin),
    [isAdmin, user?.planId]
  );
  const visibleTemplates = useMemo(
    () => templates.slice(0, visibleCount),
    [templates, visibleCount]
  );
  const hasMoreTemplates = visibleCount < templates.length;

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadCatalog(user?.uid)
      .then(({ templates: loadedTemplates, music: loadedMusic, templateError, musicError }) => {
        if (!active) return;
        if (templateError) {
          console.warn('[templates] Catalog load failed:', templateError);
          toast.error('Nao foi possivel carregar o catalogo de templates.');
        }
        if (musicError) {
          console.warn('[templates] Custom music unavailable:', musicError);
        }
        setTemplates(mergeTemplates(loadedTemplates));
        setMusic(loadedMusic);
        setVisibleCount(INITIAL_TEMPLATE_COUNT);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!canUpload) {
      toast.error('Seu plano nao libera upload de template personalizado.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadTemplateToServer(file, setProgress);
      const isAnimated = uploaded.mimetype === 'video/webm';
      const template = await createTemplate({
        name: file.name.replace(/\.[^.]+$/, '') || 'Template personalizado',
        category: 'premium',
        colors: { primary: '#7c3aed', secondary: '#00d4ff' },
        font: 'Inter',
        overlayUrl: isAnimated ? undefined : uploaded.publicUrl || uploaded.templateUrl,
        animationUrl: isAnimated ? uploaded.publicUrl || uploaded.templateUrl : undefined,
        storagePath: uploaded.storagePath,
        animationStoragePath: isAnimated ? uploaded.storagePath : undefined,
        ownerId: user.uid,
        source: 'custom',
        aspectRatio: '9:16',
        effects: isAnimated ? ['motion_overlay', 'cinematic'] : ['clean', 'cinematic'],
        isGlobal: false,
        isActive: true,
      });
      setTemplates((current) => mergeTemplates([template, ...current]));
      setVisibleCount((current) => Math.max(current, INITIAL_TEMPLATE_COUNT));
      toast.success('Template enviado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar template.');
    } finally {
      setUploading(false);
    }
  }

  async function handleMusicUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!canUpload) {
      toast.error('Seu plano nao libera upload de musica personalizada.');
      return;
    }

    setUploadingMusic(true);
    setMusicProgress(0);
    try {
      const uploaded = await uploadMusicToServer(file, setMusicProgress);
      const track = await createMusic({
        name: file.name.replace(/\.[^.]+$/, '') || 'Musica personalizada',
        category: 'ambient',
        musicUrl: uploaded.publicUrl || uploaded.musicUrl,
        storagePath: uploaded.storagePath,
        ownerId: user.uid,
        source: 'custom',
        isGlobal: false,
        isActive: true,
      });
      setMusic((current) => [track, ...current]);
      toast.success('Musica enviada com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar musica.');
    } finally {
      setUploadingMusic(false);
    }
  }

  async function handleSeedSupabase() {
    if (!isAdmin) return;
    setSeeding(true);
    try {
      const uploaded = await seedGeneratedTemplates(720);
      setTemplates((current) => mergeTemplates([...uploaded.map((template) => ({ ...template, source: 'generated' as const })), ...current]));
      setVisibleCount(INITIAL_TEMPLATE_COUNT);
      toast.success('Catalogo transparente salvo no Supabase.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao semear catalogo.');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-40 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-sm text-white/40">{templates.length} templates disponiveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="secondary" loading={seeding} onClick={handleSeedSupabase} icon={<Database className="h-4 w-4" />}>
              Salvar catalogo
            </Button>
          )}
          <label className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${canUpload ? 'cursor-pointer bg-gradient-brand text-white shadow-glow' : 'cursor-not-allowed border border-white/10 bg-white/[0.055] text-white/40'}`}>
            {canUpload ? <Upload className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {uploading ? `Enviando ${progress}%` : 'Enviar template'}
            <input type="file" accept="image/png,image/svg+xml,image/webp,video/webm" className="hidden" disabled={!canUpload || uploading} onChange={handleUpload} />
          </label>
          <label className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${canUpload ? 'cursor-pointer border border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.1]' : 'cursor-not-allowed border border-white/10 bg-white/[0.055] text-white/40'}`}>
            {canUpload ? <Music2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {uploadingMusic ? `Musica ${musicProgress}%` : 'Enviar musica'}
            <input type="file" accept="audio/mpeg,audio/wav,audio/aac,audio/mp4,audio/ogg,audio/webm" className="hidden" disabled={!canUpload || uploadingMusic} onChange={handleMusicUpload} />
          </label>
        </div>
      </div>

      {!canUpload && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
          Upload de templates personalizados fica liberado nos planos Profissional e Ilimitado.
        </div>
      )}

      {music.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Music2 className="h-4 w-4 text-brand-300" />
            <h2 className="text-sm font-bold text-white">Musicas personalizadas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {music.map((track) => (
              <div key={track.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="truncate text-sm font-semibold text-white">{track.name}</p>
                <p className="mb-2 text-xs text-white/35">{track.source || 'custom'} - {track.category}</p>
                {track.musicUrl && <audio src={track.musicUrl} controls preload="none" className="h-9 w-full" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState icon={<Layers className="h-8 w-8" />} title="Nenhum template" description="Os templates do catalogo serao exibidos assim que o backend responder." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                activeMotionId={activeMotionId}
                setActiveMotionId={setActiveMotionId}
              />
            ))}
          </div>
          {hasMoreTemplates && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-white/35">
                Mostrando {visibleTemplates.length} de {templates.length}
              </p>
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((current) => Math.min(current + TEMPLATE_BATCH_SIZE, templates.length))}
              >
                Carregar mais templates
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
