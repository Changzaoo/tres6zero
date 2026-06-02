import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <select
        ref={ref}
        className={`w-full border ${error ? 'border-red-500/60' : 'border-white/10'} rounded-[18px] bg-white/[0.055] px-4 py-3 text-white backdrop-blur-md transition-all focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-surface-50">{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
