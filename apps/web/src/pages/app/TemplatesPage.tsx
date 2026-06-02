import { useEffect, useMemo, useState } from 'react';
import { Database, Layers, Lock, Upload, Zap } from 'lucide-react';
import { getTemplates, seedTemplates, createTemplate } from '@/services/templateService';
import { uploadTemplateToServer, seedGeneratedTemplates } from '@/services/serverMediaService';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { hasFeature } from '@/config/plans';
import { motion } from 'framer-motion';
import type { AppTemplate } from '@/types';

export default function TemplatesPage() {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);

  const canUpload = useMemo(
    () => isAdmin || hasFeature(user?.planId, 'custom_template_upload', isAdmin),
    [isAdmin, user?.planId]
  );

  async function refresh() {
    const t = await getTemplates();
    setTemplates(t);
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
      const template = await createTemplate({
        name: file.name.replace(/\.[^.]+$/, '') || 'Template personalizado',
        category: 'premium',
        colors: { primary: '#7c3aed', secondary: '#00d4ff' },
        font: 'Inter',
        overlayUrl: uploaded.publicUrl || uploaded.templateUrl,
        storagePath: uploaded.storagePath,
        ownerId: user.uid,
        source: 'custom',
        aspectRatio: '9:16',
        effects: ['clean', 'cinematic'],
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

  async function handleSeedSupabase() {
    if (!isAdmin) return;
    setSeeding(true);
    try {
      const uploaded = await seedGeneratedTemplates(216);
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
            <input type="file" accept="image/png,image/svg+xml,image/webp" className="hidden" disabled={!canUpload || uploading} onChange={handleUpload} />
          </label>
        </div>
      </div>

      {!canUpload && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
          Upload de templates personalizados fica liberado nos planos Profissional e Ilimitado.
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
                <div className="aspect-[9/16] max-h-56 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}>
                  <BrandWordmark className="text-3xl drop-shadow-lg" />
                  {t.overlayUrl && <img src={t.overlayUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/45 px-3 py-1.5 rounded-full">Usar template</span>
                  </div>
                </div>
                <div className="p-3 bg-surface-50">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="purple">{t.category}</Badge>
                    <span className="text-xs text-white/30">{t.aspectRatio}</span>
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
