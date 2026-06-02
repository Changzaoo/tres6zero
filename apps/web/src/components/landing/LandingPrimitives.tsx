import { type ReactNode } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { CheckCircle2, type LucideIcon } from 'lucide-react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & MotionProps;

export function RevealOnScroll({ children, className = '', delay = 0, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px -8% 0px' }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type SectionProps = {
  id?: string;
  kicker?: string;
  title?: ReactNode;
  lead?: string;
  align?: 'left' | 'center';
  tight?: boolean;
  children: ReactNode;
  className?: string;
};

export function Section({ id, kicker, title, lead, align = 'left', tight, children, className = '' }: SectionProps) {
  const centered = align === 'center';
  const padding = tight ? 'py-16 sm:py-20 lg:py-20' : 'py-16 sm:py-20 lg:py-28';
  return (
    <section id={id} className={`relative ${padding} ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {(kicker || title || lead) && (
          <RevealOnScroll className={`mb-10 flex max-w-3xl flex-col gap-4 ${centered ? 'mx-auto items-center text-center' : ''}`}>
            {kicker && <span className="six3-kicker">{kicker}</span>}
            {title && <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.04] tracking-[-0.03em] text-white">{title}</h2>}
            {lead && <p className={`text-base leading-relaxed text-white/55 sm:text-lg ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{lead}</p>}
          </RevealOnScroll>
        )}
        {children}
      </div>
    </section>
  );
}

export function GlassCard({
  children,
  className = '',
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`six3-glass ${hover ? 'six3-card-hover' : ''} ${className}`}>{children}</div>;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <GlassCard className="h-full p-5 sm:p-6">
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-[16px] border border-white/10 bg-white/[0.055] text-brand-200">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-black tracking-[-0.02em] text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
      </GlassCard>
    </RevealOnScroll>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-white/70">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}
