import { useMemo, useState } from 'react';
import { getTemplatePublicUrl } from '@/services/templateStorage';
import type { AppTemplate } from '@/types';

type TemplateOverlayRendererProps = {
  template: AppTemplate | null | undefined;
  className?: string;
  opacity?: number;
  preferPreview?: boolean;
};

function isVideoOverlay(url: string, format?: string) {
  return format === 'webm' || /\.(webm|mp4|mov)(\?|$)/i.test(url);
}

function templateSources(template: AppTemplate, preferPreview?: boolean) {
  const first = preferPreview
    ? [template.previewUrl, template.overlayUrl, template.animationUrl, template.frameUrl]
    : [template.overlayUrl, template.animationUrl, template.frameUrl, template.previewUrl];

  return [
    ...first,
    getTemplatePublicUrl(template.storagePath),
    getTemplatePublicUrl(template.previewPath),
  ].filter(Boolean) as string[];
}

export function TemplateOverlayRenderer({
  template,
  className = '',
  opacity,
  preferPreview,
}: TemplateOverlayRendererProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const sources = useMemo(() => (template ? templateSources(template, preferPreview) : []), [preferPreview, template]);
  if (!template) return null;

  const src = sources.find((candidate) => !failed.includes(candidate));
  if (!src) return null;

  const resolvedOpacity = opacity ?? template.opacityDefault ?? 1;
  const overlayClass = `template-overlay absolute inset-0 h-full w-full object-contain pointer-events-none ${className}`;
  const format = template.assetFormat || template.format;

  if (isVideoOverlay(src, format)) {
    return (
      <video
        key={src}
        className={overlayClass}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{ opacity: resolvedOpacity }}
        onError={() => setFailed((current) => [...current, src])}
      />
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      className={overlayClass}
      style={{ opacity: resolvedOpacity }}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailed((current) => [...current, src])}
    />
  );
}
