const DEFAULT_SUPABASE_URL = 'https://fepyzmawcsetlyinztjc.supabase.co';
export const DEFAULT_TEMPLATE_BUCKET = 'six3-project-templates';

function supabaseUrl() {
  return (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
}

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function getTemplatePublicUrl(path?: string | null, bucket = DEFAULT_TEMPLATE_BUCKET) {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${supabaseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(path)}`;
}

export function isTemplateAnimated(template?: { templateType?: string; type?: string; animationUrl?: string } | null) {
  return Boolean(template && (template.templateType === 'animated' || template.type === 'animated' || template.animationUrl));
}
