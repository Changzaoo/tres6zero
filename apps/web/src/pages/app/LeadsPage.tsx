import { useEffect, useState } from 'react';
import { Users, Download, MessageCircle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getAllLeads, leadsToCSV, downloadCSV } from '@/services/leadService';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import type { Lead } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllLeads().then(l => { setLeads(l); setFiltered(l); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(leads.filter(l => l.name.toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.email || '').toLowerCase().includes(q)));
  }, [search, leads]);

  function handleExport() {
    downloadCSV(leadsToCSV(filtered));
  }

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-white/40 text-sm">{leads.length} lead(s) capturado(s)</p>
        </div>
        <Button variant="secondary" onClick={handleExport} icon={<Download className="w-4 h-4" />} size="sm">Exportar CSV</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/40" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="Nenhum lead" description="Os leads capturados na galeria aparecem aqui." />
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-gradient-glass border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-sm font-bold text-white shrink-0">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{lead.name}</p>
                <p className="text-xs text-white/40">{lead.phone || lead.email || '—'}</p>
              </div>
              <div className="text-xs text-white/30">{lead.createdAt ? format(new Date(lead.createdAt), 'dd/MM', { locale: ptBR }) : '—'}</div>
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg text-green-400/60 hover:text-green-400 hover:bg-green-500/8 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
