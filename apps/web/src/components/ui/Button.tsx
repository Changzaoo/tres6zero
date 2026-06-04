import { forwardRef, ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'six3-btn-shine bg-gradient-brand text-white shadow-glow ring-1 ring-white/[0.16] hover:shadow-[0_22px_70px_-26px_rgba(139,92,246,0.95)]',
  secondary: 'border border-white/10 bg-white/[0.065] text-white backdrop-blur-md hover:bg-white/[0.1] hover:border-white/[0.16]',
  ghost: 'text-white/70 hover:text-white hover:bg-white/[0.065]',
  danger: 'bg-red-600/90 text-white hover:bg-red-600 ring-1 ring-red-300/15',
  outline: 'border border-brand-400/55 text-brand-200 bg-brand-500/5 hover:bg-brand-500/12 hover:text-white',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-full',
  md: 'px-5 py-2.5 text-sm rounded-full',
  lg: 'px-6 py-3 text-base rounded-full',
  xl: 'px-7 py-4 text-base sm:text-lg rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex max-w-full items-center justify-center gap-2 whitespace-nowrap font-bold leading-tight tracking-normal transition-all duration-300 active:scale-[0.98] hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </span>
    </button>
  )
);
Button.displayName = 'Button';
