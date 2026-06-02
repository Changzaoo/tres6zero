type BrandLogoProps = {
  className?: string;
  wordmarkClassName?: string;
};

const BRAND_LOGO_SRC = '/brand/six3.png';

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center leading-none ${className}`} aria-label="SIX3">
      <img
        src={BRAND_LOGO_SRC}
        alt=""
        aria-hidden="true"
        className={`${imageSizeClass(className)} w-auto max-w-full select-none object-contain`}
        draggable={false}
      />
    </span>
  );
}

function imageSizeClass(wordmarkClassName: string) {
  if (wordmarkClassName.includes('text-6xl')) return 'h-24';
  if (wordmarkClassName.includes('text-5xl')) return 'h-20';
  if (wordmarkClassName.includes('text-4xl')) return 'h-16';
  if (wordmarkClassName.includes('text-3xl')) return 'h-14';
  if (wordmarkClassName.includes('text-2xl')) return 'h-11';
  if (wordmarkClassName.includes('text-xl')) return 'h-9';
  if (wordmarkClassName.includes('text-lg')) return 'h-8';
  if (wordmarkClassName.includes('text-base')) return 'h-7';
  return 'h-10';
}

export function BrandLogo({ className = '', wordmarkClassName = '' }: BrandLogoProps) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <img
        src={BRAND_LOGO_SRC}
        alt="SIX3"
        className={`${imageSizeClass(wordmarkClassName)} w-auto max-w-[220px] select-none object-contain`}
        draggable={false}
      />
    </div>
  );
}
