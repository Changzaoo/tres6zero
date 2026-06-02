import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>}
        <input
          ref={ref}
          className={`w-full border ${error ? 'border-red-500/60' : 'border-white/10'} rounded-[18px] bg-white/[0.055] px-4 py-3 text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
