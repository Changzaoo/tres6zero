import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart2,
  Camera,
  CheckCircle2,
  Download,
  Layers,
  LockKeyhole,
  QrCode,
  Share2,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo, BrandWordmark } from '@/components/brand/BrandLogo';

const features = [
  { icon: Camera, title: 'Captura 360', desc: 'Organize a operação, publique vídeos e entregue galerias compartilháveis.' },
  { icon: Layers, title: 'Templates escaláveis', desc: 'Comece com modelos essenciais e libere experiências mais completas por plano.' },
  { icon: QrCode, title: 'QR Code automático', desc: 'Cada galeria e entrega ganha um acesso rápido, pronto para o convidado.' },
  { icon: Users, title: 'Leads protegidos', desc: 'Capture contatos antes do download e mantenha tudo vinculado ao evento.' },
  { icon: Wifi, title: 'Modo offline', desc: 'Continue trabalhando em locais com conexão instável e sincronize quando voltar.' },
  { icon: BarChart2, title: 'Analytics', desc: 'Veja acessos, downloads e compartilhamentos para medir cada ativação.' },
];

const workflow = [
  'Crie o evento e escolha o template',
  'Publique vídeos, QR Codes e galerias',
  'Libere leads, downloads e relatórios',
];

function ProductPreview() {
  return (
    <div className="relative mx-auto grid min-h-[430px] w-full max-w-[34rem] place-items-center lg:min-h-[540px]">
      <motion.div
        initial={{ opacity: 0, y: 26, rotateX: 8, rotateY: -12 }}
        animate={{ opacity: 1, y: 0, rotateX: 6, rotateY: -10 }}
        transition={{ delay: 0.15, duration: 0.7 }}
        className="absolute right-0 top-12 hidden h-[20rem] w-[28rem] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-glass shadow-glass backdrop-blur-xl md:block"
      >
        <div className="flex h-8 items-center gap-2 border-b border-white/10 bg-white/[0.035] px-4">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-gradient-brand" />
          <span className="ml-auto font-mono text-[10px] text-white/35">six3.app/studio</span>
        </div>
        <div className="grid h-[calc(100%-2rem)] grid-cols-[3.25rem_1fr]">
          <aside className="flex flex-col items-center gap-3 border-r border-white/10 bg-white/[0.02] py-4">
            {[Camera, Layers, QrCode, Users].map((Icon, index) => (
              <span
                key={index}
                className={`grid h-8 w-8 place-items-center rounded-xl ${index === 0 ? 'bg-gradient-brand text-white' : 'bg-white/[0.055] text-white/40'}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </aside>
          <main className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/45">Evento ativo</p>
                <h3 className="text-lg font-black text-white">Experiência 360</h3>
              </div>
              <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 font-mono text-xs text-brand-200">
                online
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Galeria', 'Leads', 'QR'].map((label, index) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="font-mono text-[10px] uppercase text-white/35">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">{index === 0 ? '24' : index === 1 ? '186' : '12'}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50">Compartilhamentos</span>
                <Share2 className="h-4 w-4 text-brand-300" />
              </div>
              <div className="flex h-24 items-end gap-2">
                {[35, 55, 44, 72, 64, 88, 78].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-300"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={{ delay: 0.28, duration: 0.7 }}
        className="relative w-[min(78vw,18.25rem)] rounded-[2.2rem] border border-white/[0.12] bg-[#07080b] p-2 shadow-[0_34px_90px_-38px_rgba(59,109,255,0.9)]"
      >
        <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-surface-100">
          <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-8">
            <BrandWordmark className="text-lg" />
            <span className="rounded-full bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-white/45">9:16</span>
          </div>
          <div className="space-y-3 p-3">
            <div className="aspect-[9/13] rounded-[1.25rem] border border-white/10 bg-[linear-gradient(160deg,#1c2430_0%,#0b0d12_52%,#151821_100%)] p-3">
              <div className="flex h-full flex-col justify-between">
                <span className="w-fit rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-bold text-white/60">
                  Booth 360
                </span>
                <div className="rounded-2xl bg-black/30 p-3 backdrop-blur">
                  <p className="text-sm font-black text-white">Vídeo pronto</p>
                  <p className="mt-1 text-xs text-white/45">QR, download e lead capture ativos.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[Download, QrCode, Users].map((Icon, index) => (
                <span key={index} className="grid h-12 place-items-center rounded-2xl bg-white/[0.055] text-white/70">
                  <Icon className="h-5 w-5" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="six3-grid-bg min-h-screen bg-surface text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-surface/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="text-left">
            <BrandLogo wordmarkClassName="text-2xl" />
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <a href="#recursos" className="rounded-full px-4 py-2 text-sm font-semibold text-white/55 hover:bg-white/[0.055] hover:text-white">
              Recursos
            </a>
            <a href="#fluxo" className="rounded-full px-4 py-2 text-sm font-semibold text-white/55 hover:bg-white/[0.055] hover:text-white">
              Fluxo
            </a>
            <a href="#planos" className="rounded-full px-4 py-2 text-sm font-semibold text-white/55 hover:bg-white/[0.055] hover:text-white">
              Planos
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
            <Button size="sm" onClick={() => navigate('/plans')}>Começar</Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white/55 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand shadow-[0_0_16px_rgba(59,109,255,0.85)]" />
              SaaS 360 para eventos e ativações
            </div>
            <h1 className="text-[clamp(3.35rem,13vw,8rem)] font-black leading-[0.88] tracking-normal text-white">
              SIX3<span className="brand-degree">°</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
              Uma plataforma premium para publicar experiências 360, entregar galerias com QR Code, capturar leads, trabalhar offline e controlar o acesso por assinatura.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="xl" onClick={() => navigate('/plans')} icon={<ArrowRight className="h-5 w-5" />}>
                Começar a jornada
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/login')}>
                Já tenho conta
              </Button>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-4">
              {[
                ['Pix', 'pagamento'],
                ['Offline', 'salvar local'],
                ['Server-side', 'acesso seguro'],
              ].map(([value, label]) => (
                <div key={value}>
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white/35">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <ProductPreview />
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Recursos</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
              A operação 360 em uma tela só.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.04 }}
                className="rounded-[24px] border border-white/[0.08] bg-gradient-glass p-5 shadow-glass backdrop-blur-md"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-brand-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{desc}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="fluxo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[30px] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Fluxo automático</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
                Do cadastro ao acesso pago, tudo encaixado.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/55">
                O visitante cria conta, escolhe o plano e só libera os módulos após o pagamento. Admin tem visão total dos acessos ativos.
              </p>
            </div>
            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-surface-100/80 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand font-black text-white">
                    {index + 1}
                  </span>
                  <p className="font-bold text-white">{item}</p>
                  <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-brand-300" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[30px] border border-brand-400/20 bg-gradient-to-br from-brand-500/15 via-white/[0.035] to-white/[0.02] p-6 shadow-glow backdrop-blur-xl sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-2 text-sm text-brand-100">
                  <LockKeyhole className="h-4 w-4" />
                  Recursos bloqueados até o pagamento
                </div>
                <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">
                  Escolha um plano e libere o SIX3<span className="brand-degree">°</span>.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/55">
                  Planos com Pix, renovação mensal de acesso e recursos escalando de templates essenciais até uso ilimitado.
                </p>
              </div>
              <Button size="xl" onClick={() => navigate('/plans')} icon={<ArrowRight className="h-5 w-5" />}>
                Ver planos
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo wordmarkClassName="text-xl" />
          <span>© 2026 SIX3°. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
