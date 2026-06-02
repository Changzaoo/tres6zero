import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-2 border-white/10 border-t-brand-500"
      />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-screen items-center justify-center overflow-hidden bg-surface px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="h-28 w-28 rounded-full border-2 border-white/10 border-t-brand-500"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandLogo className="items-center" wordmarkClassName="text-xl" />
          </div>
        </div>
        <p className="text-sm text-white/40">Carregando plataforma...</p>
      </div>
    </div>
  );
}
