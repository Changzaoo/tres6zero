import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart2,
  Captions,
  Check,
  ChevronRight,
  Download,
  FileVideo,
  Layers,
  Menu,
  Music2,
  QrCode,
  Scissors,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandWordmark } from '@/components/brand/BrandLogo';
import { HeroMockup, PhoneMockup, DesktopMockup } from '@/components/landing/LandingMockups';
import { FeatureCard, GlassCard, RevealOnScroll, Section, CheckItem } from '@/components/landing/LandingPrimitives';
import { MouseAura } from '@/components/landing/MouseAura';
import { PLANS } from '@/config/plans';

const navLinks = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como', label: 'Como funciona' },
  { href: '#estilos', label: 'Estilos' },
  { href: '#planos', label: 'Planos' },
];

const promises = [
  {
    icon: Zap,
    title: 'Do bruto ao viral',
    description: 'Envie vídeos crus e receba versões prontas para publicar, com cortes, ritmo e acabamento visual.',
  },
  {
    icon: Wand2,
    title: 'Edição com IA',
    description: 'A plataforma analisa cenas, áudio, pausas e energia do conteúdo para aplicar o melhor tratamento.',
  },
  {
    icon: FileVideo,
    title: 'Mobile e desktop',
    description: 'Comece pelo celular no evento e finalize no PC com preview, timeline e exportação na nuvem.',
  },
];

const flow = [
  {
    title: 'Envie seus vídeos',
    description: 'Faça upload pelo celular ou desktop, incluindo arquivos brutos, templates e trilhas próprias.',
  },
  {
    title: 'Escolha o estilo',
    description: 'Use presets de edição, templates transparentes, formato e música ideal para cada entrega.',
  },
  {
    title: 'A IA prepara tudo',
    description: 'Cortes, slow motion, filtros, legendas, efeitos e sobreposições entram no ritmo do vídeo.',
  },
  {
    title: 'Publique e compartilhe',
    description: 'O SIX3° gera galeria, QR Code e links para cliente, leads, downloads e acompanhamento.',
  },
];

const features = [
  {
    icon: Scissors,
    title: 'Cortes automáticos',
    description: 'Identifica momentos fortes e remove pausas para deixar o vídeo mais direto e compartilhável.',
  },
  {
    icon: Captions,
    title: 'Legendas dinâmicas',
    description: 'Transcrição visual sincronizada, pronta para Reels, Shorts, TikTok e galerias de evento.',
  },
  {
    icon: Layers,
    title: 'Templates inteligentes',
    description: 'Templates essenciais, premium e personalizados para sobrepor identidade visual aos vídeos.',
  },
  {
    icon: Music2,
    title: 'Músicas e temas',
    description: 'Biblioteca de trilhas e uploads do usuário separados dos assets principais da plataforma.',
  },
  {
    icon: QrCode,
    title: 'Galerias com QR Code',
    description: 'Cada evento ganha página pública com capa, mídia selecionada, downloads e captura de leads.',
  },
  {
    icon: BarChart2,
    title: 'Analytics de entrega',
    description: 'Acompanhe acessos, downloads, compartilhamentos e sinais de engajamento por evento.',
  },
  {
    icon: ShieldCheck,
    title: 'Acesso server-side',
    description: 'Planos, cargo admin e liberação de recursos ficam protegidos no backend, fora do client.',
  },
  {
    icon: UploadCloud,
    title: 'Uploads personalizados',
    description: 'Templates e músicas enviados pelo usuário ficam em buckets próprios, com acesso por plano.',
  },
  {
    icon: Download,
    title: 'Salvar offline',
    description: 'Continue trabalhando quando a internet oscilar e sincronize quando a conexão voltar.',
  },
];

const styles = [
  ['Viral Shorts', 'Ritmo acelerado, ganchos curtos, zooms e legendas grandes.', 'from-blue-500 to-violet-500'],
  ['Cinematic', 'Cor rica, transições suaves e um ar de filme para entregas premium.', 'from-indigo-500 to-fuchsia-500'],
  ['Clean Apple', 'Minimalista, tipografia respirada e foco total no vídeo.', 'from-slate-300 to-slate-500'],
  ['Party Pop', 'Flashs, batidas marcadas e energia alta para pista e celebrações.', 'from-cyan-400 to-purple-500'],
  ['Business Ads', 'Direto, elegante e com chamada clara para ativações comerciais.', 'from-sky-500 to-indigo-500'],
  ['Wedding Soft', 'Luz suave, slow motion e sensação emocional para eventos especiais.', 'from-violet-300 to-blue-500'],
];

const benefits = [
  'Economize horas de edição em cada evento ou campanha',
  'Padronize a identidade visual sem depender de operação manual',
  'Libere recursos conforme o plano e mantenha tudo bloqueado até o pagamento',
  'Use no celular, notebook ou PC sem mudar o fluxo do projeto',
  'Entregue página própria com QR Code para operador compartilhar com o cliente',
  'Acompanhe leads e resultados depois que o vídeo saiu do booth',
];

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function LandingNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 flex h-[var(--nav-h)] items-center border-b transition-all duration-300 ${
          scrolled ? 'border-white/10 bg-[#08090c]/80 shadow-2xl shadow-black/20 backdrop-blur-2xl' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('/')} aria-label="SIX3°" className="text-left">
            <BrandWordmark className="text-2xl" />
          </button>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-bold text-white/55 transition hover:bg-white/[0.055] hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden rounded-full px-4 py-2 text-sm font-bold text-white/55 transition hover:bg-white/[0.055] hover:text-white sm:inline-flex"
            >
              Entrar
            </button>
            <Button size="sm" onClick={() => navigate('/plans')}>
              Começar agora
            </Button>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70 backdrop-blur md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-[#08090c]/90 px-5 pb-8 pt-[calc(var(--nav-h)+1rem)] backdrop-blur-2xl md:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/70"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col gap-2">
            {navLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-white/10 py-5 text-2xl font-black tracking-[-0.02em] text-white"
              >
                {link.label}
                <span className="font-mono text-xs font-bold text-white/30">{String(index + 1).padStart(2, '0')}</span>
              </a>
            ))}
          </div>
          <Button className="mt-8 w-full" size="xl" onClick={() => navigate('/plans')}>
            Começar agora
          </Button>
        </div>
      )}
    </>
  );
}

function PricingPreview() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan, index) => (
        <RevealOnScroll key={plan.id} delay={index * 0.06}>
          <GlassCard className={`flex h-full flex-col p-5 sm:p-6 ${plan.highlight ? 'border-brand-400/50 shadow-glow' : ''}`}>
            {plan.highlight && (
              <span className="mb-4 inline-flex w-fit rounded-full bg-gradient-brand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-glow">
                Mais escolhido
              </span>
            )}
            <h3 className="text-xl font-black tracking-[-0.02em] text-white">{plan.name}</h3>
            <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-white/50">{plan.tagline}</p>
            <div className="mt-6 flex items-end gap-1">
              <span className="pb-1 text-sm text-white/40">R$</span>
              <span className="text-4xl font-black leading-none tracking-[-0.03em] text-white">{priceFormatter.format(plan.price)}</span>
              <span className="pb-1 font-mono text-xs text-white/35">/mês</span>
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {plan.features.slice(0, plan.id === 'unlimited' ? 6 : 5).map((feature) => (
                <li key={feature.label} className="flex gap-2 text-sm leading-relaxed text-white/70" title={feature.description}>
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={plan.highlight ? 'primary' : 'secondary'}
              onClick={() => navigate('/plans')}
            >
              {plan.id === 'unlimited' ? 'Liberar ilimitado' : 'Escolher plano'}
            </Button>
          </GlassCard>
        </RevealOnScroll>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const compactBenefits = useMemo(() => benefits.slice(0, 6), []);

  function scrollToDemo() {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="six3-grid-bg min-h-screen overflow-x-clip bg-surface text-white">
      <MouseAura />
      <LandingNav />

      <main className="relative z-10">
        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 pb-12 pt-[calc(var(--nav-h)+2rem)] sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pb-16 lg:pt-[calc(var(--nav-h)+4rem)]">
          <RevealOnScroll className="max-w-3xl">
            <span className="six3-eyebrow">
              <span className="six3-eyebrow-dot" />
              Edição de vídeo com IA · 360°
            </span>
            <h1 className="mt-7 text-[clamp(2.7rem,8vw,5.9rem)] font-black leading-[0.94] tracking-[-0.055em] text-white">
              Edite vídeos automaticamente em <span className="six3-gradient-text">qualquer lugar</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
              SIX3° transforma vídeos brutos em conteúdos prontos para postar, com cortes inteligentes, legendas, efeitos, música, ritmo e formatos otimizados para cada rede social.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="xl" onClick={() => navigate('/plans')} icon={<ArrowRight className="h-5 w-5" />}>
                Começar agora
              </Button>
              <Button variant="secondary" size="xl" onClick={scrollToDemo} icon={<Sparkles className="h-5 w-5" />}>
                Ver demonstração
              </Button>
            </div>
            <div className="mt-9 grid max-w-2xl grid-cols-3 gap-4">
              {[
                ['10x', 'mais rápido'],
                ['4 formatos', 'auto export'],
                ['0', 'experiência exigida'],
              ].map(([value, label]) => (
                <div key={value} className="min-w-0">
                  <p className="text-xl font-black tracking-[-0.02em] text-white sm:text-2xl">{value}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/35 sm:text-[11px]">{label}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>

          <HeroMockup />
        </section>

        <Section tight>
          <div className="grid gap-4 md:grid-cols-3">
            {promises.map(({ icon: Icon, title, description }, index) => (
              <RevealOnScroll key={title} delay={index * 0.08}>
                <GlassCard className="h-full overflow-hidden p-6">
                  <div className="mb-5 grid h-[3.25rem] w-[3.25rem] place-items-center rounded-[18px] border border-white/10 bg-white/[0.055] text-brand-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black tracking-[-0.02em] text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p>
                </GlassCard>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        <Section
          id="como"
          kicker="Fluxo automático"
          title="Como o SIX3° trabalha por você"
          lead="Quatro passos para transformar captura 360 em entrega profissional, com menos operação manual e mais consistência."
        >
          <div className="relative grid gap-4 md:grid-cols-4">
            <div className="absolute left-[7%] right-[7%] top-7 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
            <div className="absolute left-[7%] top-7 hidden h-px w-[86%] bg-gradient-brand shadow-[0_0_22px_rgba(59,109,255,.55)] md:block" />
            {flow.map((step, index) => (
              <RevealOnScroll key={step.title} delay={index * 0.08}>
                <div className="relative z-10 flex h-full flex-col gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-gradient-brand text-lg font-black text-white shadow-glow">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{step.description}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        <Section id="recursos" kicker="Recursos" title={<>Tudo que um editor faria. <span className="six3-gradient-text">Em automático.</span></>}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} delay={(index % 3) * 0.04} />
            ))}
          </div>
        </Section>

        <Section
          kicker="Mobile-first"
          title="Criado para editar no celular"
          lead="Uma experiência fluida para o operador trabalhar no evento: enviar mídia, escolher estilo, gerar entrega e compartilhar com QR Code."
          align="center"
        >
          <div className="relative mx-auto grid min-h-[560px] max-w-5xl place-items-center overflow-hidden">
            <div className="six3-glass six3-float-a absolute left-2 top-8 hidden items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/80 sm:flex">
              <UploadCloud className="h-5 w-5 text-brand-200" />
              Arraste os clipes
            </div>
            <div className="six3-glass six3-float-b absolute right-2 top-28 hidden items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/80 sm:flex">
              <Sparkles className="h-5 w-5 text-brand-200" />
              Escolha estilo
            </div>
            <div className="six3-glass six3-float-b absolute bottom-28 left-4 hidden items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/80 sm:flex">
              <QrCode className="h-5 w-5 text-brand-200" />
              QR para cliente
            </div>
            <PhoneMockup compact />
          </div>
        </Section>

        <Section
          kicker="Desktop"
          title="Potência completa no PC"
          lead="Sidebar, preview, timeline e painel de estilos com renderização automática em um clique, mantendo os mesmos projetos do mobile."
        >
          <RevealOnScroll>
            <DesktopMockup />
          </RevealOnScroll>
        </Section>

        <Section
          id="estilos"
          kicker="Estilos de edição"
          title="Um preset para cada vibe"
          lead="Cada estilo carrega ritmo, tipografia, filtros, cortes e efeitos próprios para entregar vídeos com intenção."
        >
          <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {styles.map(([title, description, gradient], index) => (
              <RevealOnScroll key={title} delay={index * 0.04} className="w-[78vw] max-w-[18rem] shrink-0 snap-start lg:w-auto lg:flex-1">
                <GlassCard className="h-full overflow-hidden">
                  <div className={`aspect-video bg-gradient-to-br ${gradient} relative`}>
                    <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(125deg,rgba(255,255,255,.08)_0_2px,transparent_2px_10px)]" />
                    <span className="absolute left-3 top-3 rounded-lg border border-white/20 bg-black/35 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                      {title}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
                  </div>
                </GlassCard>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        <Section tight>
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <RevealOnScroll>
              <span className="six3-kicker">Benefícios</span>
              <h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.04] tracking-[-0.03em] text-white">
                Menos tempo editando. Mais conteúdo publicado.
              </h2>
              <ul className="mt-7 flex flex-col gap-3">
                {compactBenefits.map((benefit) => (
                  <CheckItem key={benefit}>{benefit}</CheckItem>
                ))}
              </ul>
            </RevealOnScroll>
            <RevealOnScroll delay={0.1}>
              <GlassCard className="relative min-h-[28rem] overflow-hidden p-6">
                <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_32%_22%,rgba(59,109,255,.34),transparent_60%),radial-gradient(55%_65%_at_78%_84%,rgba(139,92,246,.38),transparent_62%)]" />
                <div className="relative z-10 flex h-full min-h-[24rem] flex-col justify-between">
                  <div className="six3-glass w-fit rounded-2xl px-5 py-4">
                    <b className="block text-4xl font-black tracking-[-0.04em] text-white">8h</b>
                    <small className="font-mono text-xs text-white/45">economizadas / semana</small>
                  </div>
                  <div className="six3-glass ml-auto w-fit rounded-2xl px-5 py-4 text-right">
                    <b className="six3-gradient-text block text-4xl font-black tracking-[-0.04em]">5x</b>
                    <small className="font-mono text-xs text-white/45">mais posts publicados</small>
                  </div>
                </div>
              </GlassCard>
            </RevealOnScroll>
          </div>
        </Section>

        <Section
          id="planos"
          kicker="Planos"
          title="Escolha o seu ritmo"
          lead="Os recursos ficam bloqueados até o pagamento. Depois da assinatura, o acesso renova todo mês no mesmo dia da contratação."
          align="center"
        >
          <PricingPreview />
        </Section>

        <Section tight>
          <RevealOnScroll>
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(120%_130%_at_50%_0%,rgba(139,92,246,.22),rgba(11,13,18,.98)_70%)] px-5 py-16 text-center shadow-[0_44px_120px_-60px_rgba(59,109,255,.55)] sm:px-10 lg:py-24">
              <span className="pointer-events-none absolute -right-8 -top-20 text-[18rem] font-black leading-none text-white/[0.035]">°</span>
              <h2 className="relative mx-auto max-w-3xl text-[clamp(2.1rem,6vw,4rem)] font-black leading-[1.02] tracking-[-0.04em] text-white">
                Seu próximo vídeo pode ficar pronto em <span className="six3-gradient-text">minutos</span>
              </h2>
              <p className="relative mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
                Envie, escolha o estilo e deixe o SIX3° editar, publicar e organizar a entrega por você.
              </p>
              <Button className="relative mt-8" size="xl" onClick={() => navigate('/plans')} icon={<ChevronRight className="h-5 w-5" />}>
                Começar a jornada
              </Button>
            </div>
          </RevealOnScroll>
        </Section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandWordmark className="text-3xl" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/45">
              Automação criativa em 360°. Do vídeo bruto ao conteúdo pronto para postar, em qualquer tela.
            </p>
          </div>
          {[
            ['Produto', 'Recursos', 'Como funciona', 'Estilos', 'Planos'],
            ['Plataforma', 'Mobile', 'Desktop', 'Templates', 'Analytics'],
            ['Acesso', 'Entrar', 'Criar conta', 'Pagamento', 'Suporte'],
          ].map(([title, ...items]) => (
            <div key={title}>
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">{title}</h3>
              <div className="mt-3 flex flex-col gap-2">
                {items.map((item) => (
                  <span key={item} className="text-sm text-white/50">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SIX3°. Todos os direitos reservados.</span>
          <button type="button" onClick={() => navigate('/login')} className="w-fit text-white/45 transition hover:text-white">
            Entrar na plataforma
          </button>
        </div>
      </footer>
    </div>
  );
}
