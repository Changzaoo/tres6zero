type BrandLogoProps = {
  className?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  showSubtitle?: boolean;
};

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-wordmark inline-flex items-start font-black leading-none text-white ${className}`}>
      SIX3<span className="brand-degree">°</span>
    </span>
  );
}

function imageSizeClass(wordmarkClassName: string) {
  if (wordmarkClassName.includes('text-5xl')) return 'h-20';
  if (wordmarkClassName.includes('text-4xl')) return 'h-16';
  if (wordmarkClassName.includes('text-3xl')) return 'h-14';
  if (wordmarkClassName.includes('text-2xl')) return 'h-11';
  if (wordmarkClassName.includes('text-xl')) return 'h-9';
  return 'h-10';
}

export function BrandLogo({
  className = '',
  wordmarkClassName = '',
  subtitle = 'SaaS para experiências 360',
  showSubtitle = false,
}: BrandLogoProps) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <img
        src="/brand/six3-logo.png"
        alt="SIX3°"
        className={`${imageSizeClass(wordmarkClassName)} w-auto max-w-[220px] rounded-md object-contain`}
      />
      {showSubtitle && <p className="mt-1 text-xs leading-tight text-white/45">{subtitle}</p>}
    </div>
  );
}
