import { BrandLogo } from '@/components/brand/BrandLogo';

function Six3Loader({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={`six3-loader ${className}`} viewBox="0 0 50 50" aria-hidden="true">
      <circle className="six3-loader-track" cx="25" cy="25" r="20" fill="none" />
      <circle className="six3-loader-path" cx="25" cy="25" r="20" fill="none" />
    </svg>
  );
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <Six3Loader />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-screen items-center justify-center overflow-hidden bg-surface px-4 text-center" role="status" aria-live="polite">
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
        <div className="relative h-28 w-28">
          <Six3Loader className="h-28 w-28" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandLogo className="items-center" wordmarkClassName="text-xl" />
          </div>
        </div>
        <p className="text-sm text-white/40">Carregando plataforma...</p>
      </div>
    </div>
  );
}
