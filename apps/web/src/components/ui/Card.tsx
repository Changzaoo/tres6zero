import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8', none: '' };

export function Card({ glass = true, hover = false, padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`${glass ? 'six3-glass' : 'rounded-[22px] border border-white/[0.08] bg-surface-50'} ${paddings[padding]} ${hover ? 'six3-card-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
