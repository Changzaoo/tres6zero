import { useEffect, useMemo, useState } from 'react';
import { Database, Layers, Lock, Music2, Upload, Zap } from 'lucide-react';
import { getTemplates, seedTemplates, createTemplate } from '@/services/templateService';
import { createMusic, getUserMusic } from '@/services/musicService';
import { uploadMusicToServer, uploadTemplateToServer, seedGeneratedTemplates } from '@/services/serverMediaService';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { hasFeature } from '@/config/plans';
import { motion } from 'framer-motion';
import type { AppMusic, AppTemplate } from '@/types';

function templateAspectRatio(aspectRatio: AppTemplate['aspectRatio']) {
  if (aspectRatio === '16:9') return '16 / 9';
  if (aspectRatio === '1:1') return '1 / 1';
  return '9 / 16';
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

  const canUpload = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'custom_template_upload', isAdmin),
    [isAdmin, user?.planId]
  );

  async function refresh() {
    const t = await getTemplates();
    setTemplates(t);
    if (user) {
      const tracks = await getUserMusic(user.uid);
      setMusic(tracks);
    }
  }

  useEffect(() => {
    (async () => {
      await seedTemplates();
      await refresh();
      setLoading(false);
    })();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      setTemplates((current) => [template, ...current]);
      toast.success('Template enviado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar template.');
    } finally {
      setUploading(false);
    }
  }

  async function handleMusicUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      setTemplates((current) => [...uploaded.map((template) => ({ ...template, source: 'generated' as const })), ...current]);
      toast.success('Catalogo transparente salvo no Supabase.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao semear catalogo.');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/5" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-white/40 text-sm">{templates.length} templates disponiveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="secondary" loading={seeding} onClick={handleSeedSupabase} icon={<Database className="w-4 h-4" />}>
              Salvar catalogo
            </Button>
          )}
          <label className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${canUpload ? 'cursor-pointer bg-gradient-brand text-white shadow-glow' : 'cursor-not-allowed bg-white/[0.055] text-white/40 border border-white/10'}`}>
            {canUpload ? <Upload className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {uploading ? `Enviando ${progress}%` : 'Enviar template'}
            <input type="file" accept="image/png,image/svg+xml,image/webp,video/webm" className="hidden" disabled={!canUpload || uploading} onChange={handleUpload} />
          </label>
          <label className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${canUpload ? 'cursor-pointer bg-white/[0.07] text-white border border-white/10 hover:bg-white/[0.1]' : 'cursor-not-allowed bg-white/[0.055] text-white/40 border border-white/10'}`}>
            {canUpload ? <Music2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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
          <div className="flex items-center gap-2 mb-3">
            <Music2 className="w-4 h-4 text-brand-300" />
            <h2 className="text-sm font-bold text-white">Musicas personalizadas</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {music.map((track) => (
              <div key={track.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="text-sm font-semibold text-white truncate">{track.name}</p>
                <p className="text-xs text-white/35 mb-2">{track.source || 'custom'} · {track.category}</p>
                {track.musicUrl && <audio src={track.musicUrl} controls className="w-full h-9" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState icon={<Layers className="w-8 h-8" />} title="Nenhum template" description="Os templates padrao serao carregados automaticamente." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }} className="cursor-pointer group">
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] hover:border-brand-500/30 transition-all">
                <div className="max-h-56 flex items-center justify-center relative overflow-hidden"
                  style={{ aspectRatio: templateAspectRatio(t.aspectRatio), background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}>
                  <BrandWordmark className="text-3xl drop-shadow-lg" />
                  {t.animationUrl ? (
                    <video src={t.animationUrl} className="absolute inset-0 h-full w-full object-contain" autoPlay muted loop playsInline />
                  ) : t.overlayUrl && (
                    <img src={t.overlayUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/45 px-3 py-1.5 rounded-full">Usar template</span>
                  </div>
                </div>
                <div className="p-3 bg-surface-50">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="purple">{t.category}</Badge>
                    <span className="text-xs text-white/30">{t.aspectRatio}</span>
                    {t.animationUrl && <span className="text-xs text-cyan-200/80">animado</span>}
                    {t.source && <span className="text-xs text-white/30">{t.source}</span>}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.effects.slice(0, 2).map(e => (
                      <span key={e} className="text-xs text-white/40 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />{e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
