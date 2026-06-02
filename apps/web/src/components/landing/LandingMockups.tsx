import { useState } from 'react';
import { motion } from 'framer-motion';
import { Captions, Music2, Scissors, Sparkles, UploadCloud, Wand2 } from 'lucide-react';
import { BrandWordmark } from '@/components/brand/BrandLogo';

const mockStyles = [
  { id: 'viral', label: 'Viral', caption: 'Legenda gerada por IA', ratio: '9:16', cuts: '12 cortes' },
  { id: 'cinema', label: 'Cinema', caption: 'Cor cinematic', ratio: '16:9', cuts: '9 cenas' },
  { id: 'clean', label: 'Clean', caption: 'Pronto para postar', ratio: '1:1', cuts: '4 cortes' },
];

export function PhoneMockup({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(mockStyles[0]);

  return (
    <motion.div
      className={`relative z-10 mx-auto aspect-[9/19.2] ${compact ? 'w-[min(72vw,18.5rem)]' : 'w-[min(76vw,19rem)]'} rounded-[2.55rem] border border-white/[0.12] bg-[linear-gradient(160deg,#24262e,#08090c_62%)] p-2 shadow-[0_44px_100px_-34px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.05)_inset]`}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute left-1/2 top-3 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(120%_80%_at_50%_0%,#151821,#08090c)]">
        <div className="flex items-center justify-between px-4 pb-3 pt-8">
          <BrandWordmark className="text-base" />
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 font-mono text-[10px] text-white/50">
            {active.ratio}
          </span>
        </div>

        <div className="relative mx-3 aspect-[9/13] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(150deg,#172033,#0e1119)]">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_30%_20%,rgba(59,109,255,.55),transparent_60%),radial-gradient(80%_70%_at_80%_90%,rgba(139,92,246,.55),transparent_60%)]" />
          <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(115deg,rgba(255,255,255,.04)_0_2px,transparent_2px_9px)]" />
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 font-mono text-[9px] font-bold text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" />
            AO VIVO
          </span>
          <span className="absolute right-2 top-2 rounded-md border border-white/15 bg-black/35 px-2 py-1 font-mono text-[9px] font-bold text-white/85 backdrop-blur">
            Exportando {active.ratio}
          </span>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md">
              <Sparkles className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
          <div className="absolute bottom-11 left-3 right-3 text-center text-sm font-black leading-tight text-white drop-shadow">
            {active.caption.split(' IA')[0]} <span className="rounded-md bg-gradient-brand px-1.5">IA</span>
          </div>
          <div className="absolute bottom-7 left-3 right-3 h-1 overflow-hidden rounded-full bg-white/[0.18]">
            <motion.span
              className="block h-full rounded-full bg-gradient-brand"
              animate={{ width: ['24%', '76%', '42%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="relative mx-3 mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1.5 font-mono text-[10px] text-white/70">
            Auto cut
          </span>
          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1.5 text-right font-mono text-[10px] text-white/70">
            {active.cuts}
          </span>
        </div>

        <div className="mx-3 mt-3 flex h-7 gap-1.5">
          <span className="flex-[2] rounded-md bg-gradient-brand" />
          <span className="flex-1 rounded-md bg-white/10" />
          <span className="flex-[2.4] rounded-md bg-violet-400/35" />
          <span className="flex-1 rounded-md bg-white/10" />
        </div>

        <div className="mx-3 mt-3 grid grid-cols-3 gap-1.5">
          {mockStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setActive(style)}
              className={`rounded-xl border px-1 py-2 text-center text-[10px] font-bold transition ${
                active.id === style.id
                  ? 'border-transparent bg-gradient-brand text-white shadow-glow'
                  : 'border-white/10 bg-white/[0.045] text-white/50 hover:text-white'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>

        <div className="mx-3 mb-3 mt-auto">
          <button type="button" className="six3-btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-4 py-3 text-sm font-black text-white shadow-glow">
            <Wand2 className="h-4 w-4" />
            Gerar vídeo
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function DesktopMockup() {
  return (
    <div className="six3-glass overflow-hidden rounded-[30px] shadow-[0_50px_120px_-52px_rgba(0,0,0,.92)]">
      <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.035] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-gradient-brand" />
        <span className="ml-3 hidden font-mono text-[11px] text-white/35 sm:block">six3.app/studio/projeto-final</span>
      </div>
      <div className="grid min-h-[360px] grid-cols-1 md:grid-cols-[10rem_1fr_13rem]">
        <aside className="flex gap-2 overflow-x-auto border-b border-white/10 bg-white/[0.012] p-3 md:flex-col md:border-b-0 md:border-r">
          {['Editor IA', 'Mídia', 'Legendas', 'Efeitos', 'Trilha', 'Exportar'].map((item, index) => (
            <span
              key={item}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                index === 0 ? 'bg-gradient-brand text-white' : 'bg-white/[0.035] text-white/50'
              }`}
            >
              <span className="h-3.5 w-3.5 rounded bg-current opacity-70" />
              {item}
            </span>
          ))}
        </aside>
        <main className="flex min-h-[320px] flex-col gap-3 p-4">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(150deg,#141821,#0d0f15)]">
            <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_35%_30%,rgba(59,109,255,.42),transparent_60%),radial-gradient(50%_60%_at_75%_85%,rgba(139,92,246,.48),transparent_60%)]" />
            <span className="absolute left-3 top-3 rounded-lg border border-white/15 bg-black/35 px-2.5 py-1 font-mono text-[10px] font-bold text-white/80">
              PREVIEW · 16:9
            </span>
            <span className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md">
              <Sparkles className="h-7 w-7 text-white" />
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            {[
              ['VÍDEO', '42%', '24%', '30%'],
              ['LEGENDA', '20%', '34%', '18%'],
              ['ÁUDIO', '70%', '0%', '0%'],
            ].map(([label, a, b, c]) => (
              <div key={label} className="mb-2 flex h-5 items-center gap-1.5 last:mb-0">
                <span className="w-14 shrink-0 font-mono text-[9px] font-bold text-white/35">{label}</span>
                <span className="h-full rounded-md bg-gradient-brand" style={{ width: a }} />
                {b !== '0%' && <span className="h-full rounded-md bg-white/[0.12]" style={{ width: b }} />}
                {c !== '0%' && <span className="h-full rounded-md bg-violet-400/35" style={{ width: c }} />}
              </div>
            ))}
          </div>
        </main>
        <aside className="border-t border-white/10 bg-white/[0.012] p-4 md:border-l md:border-t-0">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Estilo</h4>
          <div className="mt-3 space-y-2">
            {['Viral Shorts', 'Cinematic', 'Business Ads'].map((item, index) => (
              <div key={item} className={`rounded-xl border px-3 py-2 text-sm font-bold ${index === 0 ? 'border-brand-400/25 bg-brand-500/[0.18] text-white' : 'border-white/10 bg-white/[0.035] text-white/50'}`}>
                {item}
              </div>
            ))}
          </div>
          <button type="button" className="six3-btn-shine mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-3 py-3 text-sm font-black text-white">
            <Sparkles className="h-4 w-4" />
            Renderizar
          </button>
        </aside>
      </div>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div id="demo" className="relative mx-auto grid min-h-[500px] w-full max-w-[36rem] place-items-center lg:min-h-[570px]">
      <motion.div
        className="six3-glass six3-float-b absolute right-0 top-10 hidden aspect-[16/10] w-[78%] overflow-hidden rounded-2xl md:block"
        initial={{ opacity: 0, y: 24, rotateX: 7, rotateY: -16 }}
        animate={{ opacity: 1, y: 0, rotateX: 6, rotateY: -12 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="flex h-7 items-center gap-1.5 border-b border-white/10 bg-white/[0.035] px-3">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-gradient-brand" />
        </div>
        <div className="grid h-[calc(100%-1.75rem)] grid-cols-[2.5rem_1fr]">
          <div className="flex flex-col items-center gap-2 border-r border-white/10 bg-white/[0.02] p-2">
            {[Scissors, Captions, Music2, UploadCloud].map((Icon, index) => (
              <span key={index} className={`grid h-7 w-7 place-items-center rounded-lg ${index === 0 ? 'bg-gradient-brand text-white' : 'bg-white/[0.055] text-white/40'}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2 p-3">
            <div className="relative flex-1 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#171a22,#0f1116)]">
              <div className="absolute inset-0 bg-[radial-gradient(120px_80px_at_70%_30%,rgba(139,92,246,.35),transparent)]" />
            </div>
            <div className="flex h-7 gap-1 rounded-lg bg-white/[0.03] p-1">
              <span className="flex-[2] rounded bg-gradient-brand" />
              <span className="flex-1 rounded bg-white/[0.12]" />
              <span className="flex-[3] rounded bg-white/[0.12]" />
              <span className="flex-[1.4] rounded bg-white/[0.12]" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={{ duration: 0.8, delay: 0.32 }}
      >
        <PhoneMockup />
      </motion.div>

      <div className="six3-glass six3-float-a absolute left-0 top-[18%] hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-white/80 md:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
        Auto Cut
      </div>
      <div className="six3-glass six3-float-b absolute right-2 top-[46%] hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-white/80 md:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
        Legendas IA
      </div>
    </div>
  );
}
