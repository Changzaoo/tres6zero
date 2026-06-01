import { motion } from 'framer-motion';
import { BrandLogo, BrandWordmark } from '@/components/brand/BrandLogo';

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
    <div className="six3-grid-bg fixed inset-0 bg-surface flex flex-col items-center justify-center gap-6 z-50">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-2 border-white/10 border-t-brand-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <BrandWordmark className="text-xl" />
        </div>
      </div>
      <div className="text-center">
        <BrandLogo className="items-center" wordmarkClassName="text-3xl" />
        <p className="text-white/40 text-sm mt-1">Carregando plataforma...</p>
      </div>
    </div>
  );
}
