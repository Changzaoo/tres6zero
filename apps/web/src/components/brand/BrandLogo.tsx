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

export function BrandLogo({
  className = '',
  wordmarkClassName = '',
  subtitle = 'SaaS para experiências 360',
  showSubtitle = false,
}: BrandLogoProps) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <BrandWordmark className={wordmarkClassName} />
      {showSubtitle && <p className="mt-1 text-xs leading-tight text-white/45">{subtitle}</p>}
    </div>
  );
}
