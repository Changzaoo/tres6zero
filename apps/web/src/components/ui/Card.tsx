import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8', none: '' };

export function Card({ glass = true, hover = false, padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/8 ${glass ? 'bg-gradient-glass backdrop-blur-sm' : 'bg-surface-50'} ${paddings[padding]} ${hover ? 'hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-600/10 transition-all cursor-pointer' : ''} ${className}`}
      onClick={props.onClick}
    >
      {children}
    </motion.div>
  );
}
