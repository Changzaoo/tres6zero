import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Film,
  Layers,
  Lock,
  Map,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { ImmersiveBackground } from '@/components/landing/ImmersiveBackground';

const stack = [
  ['Frontend', 'React, Vite, TypeScript, Tailwind, Vercel'],
  ['Backend', 'Express, TypeScript, Render'],
  ['Auth e dados', 'Firebase Auth, Firebase Admin, Firestore'],
  ['Storage', 'Supabase Storage para vídeos, templates e músicas'],
  ['Pagamento', 'PixGo, QR Code Pix e webhook'],
  ['Editor', 'Canvas, MediaRecorder, templates, efeitos e trilhas'],
];

const featureStatus = [
  ['Login/cadastro', 'Pronto'],
  ['Planos e PixGo', 'Pronto'],
  ['Dashboard real', 'Pronto'],
  ['Eventos e galerias', 'Pronto'],
  ['Gravacao/upload', 'Pronto'],
  ['Editor local', 'Pronto'],
  ['Templates e músicas', 'Parcial'],
  ['Offline/PWA', 'Parcial'],
  ['Recorrencia automatizada Pix', 'Planejado'],
];

const roadmap = [
  'Validar o fluxo de vídeo em celulares reais.',
  'Curar templates profissionais por categoria.',
  'Publicar termos de uso e política de privacidade.',
  'Migrar cobrança mensal para recorrencia nativa quando necessário.',
  'Adicionar testes e monitoramento.',
];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="six3-glass p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-brand-200">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  const className = value === 'Pronto'
    ? 'border-emerald-300/25 bg-emerald-500/12 text-emerald-200'
    : value === 'Parcial'
      ? 'border-amber-300/25 bg-amber-500/12 text-amber-100'
      : 'border-white/10 bg-white/[0.06] text-white/55';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>{value}</span>;
}

export default function BlueprintPage() {
  return (
    <div className="six3-grid-bg min-h-screen text-white">
      <ImmersiveBackground />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link to="/" className="inline-flex">
          <BrandLogo wordmarkClassName="text-4xl" />
        </Link>
        <Link to="/register">
          <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>Comecar</Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-12 sm:px-6">
        <section className="py-8 sm:py-12">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex rounded-full border border-brand-300/25 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-100">
              Blueprint do produto
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-normal text-white sm:text-6xl">
              SIX3° e uma esteira SaaS para entregar vídeos 360 com cara profissional.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/52 sm:text-lg">
              Esta página resume a arquitetura, jornada, MVP, roadmap e status das funcionalidades sem expor segredos ou configurações privadas.
            </p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Section icon={Map} title="Visao geral">
            <p className="text-sm leading-relaxed text-white/55">
              O produto ajuda operadores 360 a criar eventos, gravar ou enviar vídeos, aplicar templates, efeitos e trilhas, publicar links com QR Code e acompanhar leads e métricas.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Produto', 'SaaS 360'],
                ['Público', 'Operadores e eventos'],
                ['MVP', 'Vídeo + QR + galeria'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs text-white/35">{label}</p>
                  <p className="mt-1 text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Boxes} title="Arquitetura">
            <div className="space-y-2">
              {stack.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
                  <p className="mt-1 text-sm text-white/70">{value}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Section icon={Smartphone} title="Jornada">
            <ol className="space-y-3 text-sm text-white/62">
              {['Conta', 'Plano', 'Evento ou vídeo avulso', 'Editor', 'Publicação', 'QR Code', 'Métricas'].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-black text-brand-100">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={Film} title="Fluxo de dados">
            <div className="space-y-2 text-sm text-white/62">
              <p>Navegador chama o backend com token Firebase.</p>
              <p>Backend válida usuário, plano e permissão.</p>
              <p>Mídias ficam no Supabase Storage.</p>
              <p>Eventos, vídeos, leads e suporte ficam no Firestore.</p>
            </div>
          </Section>

          <Section icon={CircleDollarSign} title="MVP vendavel">
            <p className="text-sm leading-relaxed text-white/62">
              O MVP e vender o fluxo de gravar/enviar, editar, publicar com QR Code e medir resultado. A IA e templates avancados entram como diferencial, não como dependencia.
            </p>
          </Section>
        </div>

        <Section icon={Layers} title="Status das funcionalidades">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureStatus.map(([feature, status]) => (
              <div key={feature} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="text-sm font-semibold text-white/75">{feature}</span>
                <StatusBadge value={status} />
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Section icon={ShieldCheck} title="Segurança">
            <ul className="space-y-2 text-sm text-white/62">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Segredos ficam no backend/Render.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Admin por variaveis de ambiente.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Recuperação sem revelar dados completos.</li>
              <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />Revisar rules e policies antes de escala.</li>
            </ul>
          </Section>

          <Section icon={Rocket} title="Roadmap">
            <div className="space-y-3">
              {roadmap.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/68">
                  <span className="font-black text-brand-200">{String(index + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <section className="rounded-[28px] border border-brand-300/20 bg-gradient-to-br from-brand-500/18 via-white/[0.04] to-cyan-400/10 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Próxima tarefa mais importante</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                Testar e estabilizar o fluxo de vídeo em celulares reais: gravação, upload, template, efeito, música, render, QR Code e página pública.
              </p>
            </div>
            <Link to="/app/gravar">
              <Button icon={<Sparkles className="h-4 w-4" />}>Ver fluxo</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
