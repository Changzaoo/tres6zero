import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Zap, BarChart2, Users, QrCode, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const features = [
  { icon: Camera, title: 'Gravação 360', desc: 'Grave pelo navegador ou envie vídeos da câmera 360.' },
  { icon: Zap, title: 'Publicação instantânea', desc: 'Vídeo disponível na galeria em segundos.' },
  { icon: QrCode, title: 'QR Code automático', desc: 'Gere QR Codes para cada vídeo ou evento.' },
  { icon: Share2, title: 'Compartilhamento', desc: 'WhatsApp, Instagram, link direto.' },
  { icon: Users, title: 'Captura de leads', desc: 'Colete dados dos convidados antes do download.' },
  { icon: BarChart2, title: 'Dashboard completo', desc: 'Acompanhe métricas em tempo real.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center font-bold text-sm">3</div>
          <span className="font-bold text-lg">Tres6Zero</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
          <Button size="sm" onClick={() => navigate('/plans')}>Começar a jornada</Button>
        </div>
      </nav>

      <section className="relative z-10 text-center py-20 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" /> Plataforma 360 Photo Booth
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Plataforma<br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">360 completa</span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">
            Gerencie eventos, publique vídeos 360, gere QR Codes, capture leads e acompanhe métricas — tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="xl" onClick={() => navigate('/plans')} icon={<ArrowRight className="w-5 h-5" />}>
              Começar a jornada
            </Button>
            <Button variant="secondary" size="xl" onClick={() => navigate('/login')}>
              Já tenho conta
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-white mb-10">Tudo que você precisa para o evento</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-gradient-glass border border-white/8 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-1">{title}</h3>
              <p className="text-sm text-white/40">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center py-8 text-white/20 text-sm border-t border-white/5">
        © 2025 Tres6Zero. Plataforma 360 Photo Booth.
      </footer>
    </div>
  );
}
