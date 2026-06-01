import { useEffect, useState } from 'react';
import { Layers, Zap } from 'lucide-react';
import { getTemplates, seedTemplates } from '@/services/templateService';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { motion } from 'framer-motion';
import type { AppTemplate } from '@/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await seedTemplates();
      const t = await getTemplates();
      setTemplates(t);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/5" />)}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="text-white/40 text-sm">{templates.length} templates disponíveis</p>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={<Layers className="w-8 h-8" />} title="Nenhum template" description="Os templates padrão serão carregados automaticamente." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }} className="cursor-pointer group">
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] hover:border-brand-500/30 transition-all">
                <div className="aspect-[9/16] max-h-48 flex items-center justify-center relative"
                  style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}>
                  <BrandWordmark className="text-3xl drop-shadow-lg" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/40 px-3 py-1.5 rounded-full">Usar template</span>
                  </div>
                </div>
                <div className="p-3 bg-surface-50">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="purple">{t.category}</Badge>
                    <span className="text-xs text-white/30">{t.aspectRatio}</span>
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
