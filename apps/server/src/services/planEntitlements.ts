export type PlanId = 'starter' | 'pro' | 'unlimited';

export type PlanFeature =
  | 'basic_templates'
  | 'premium_templates'
  | 'custom_template_upload'
  | 'offline_recent'
  | 'offline_sync'
  | 'public_gallery'
  | 'qr_code'
  | 'basic_leads'
  | 'csv_export'
  | 'basic_effects'
  | 'popular_effects'
  | 'ai_auto_edit'
  | 'brand_customization'
  | 'advanced_analytics'
  | 'priority_support';

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanFeature[]> = {
  starter: [
    'basic_templates',
    'offline_recent',
    'public_gallery',
    'qr_code',
    'basic_leads',
    'basic_effects',
  ],
  pro: [
    'basic_templates',
    'premium_templates',
    'custom_template_upload',
    'offline_recent',
    'offline_sync',
    'public_gallery',
    'qr_code',
    'basic_leads',
    'csv_export',
    'basic_effects',
    'popular_effects',
    'brand_customization',
    'advanced_analytics',
  ],
  unlimited: [
    'basic_templates',
    'premium_templates',
    'custom_template_upload',
    'offline_recent',
    'offline_sync',
    'public_gallery',
    'qr_code',
    'basic_leads',
    'csv_export',
    'basic_effects',
    'popular_effects',
    'ai_auto_edit',
    'brand_customization',
    'advanced_analytics',
    'priority_support',
  ],
};

export const BASIC_EFFECTS = ['clean', 'slow_motion', 'boomerang'];
export const POPULAR_EFFECTS = ['speed_ramp', 'cinematic', 'neon', 'party', 'luxury', 'glitch_flash', 'wedding_soft', 'corporate_sharp'];
export const AI_EFFECTS = ['ai_auto'];

export function normalizePlanId(planId?: string | null): PlanId {
  return planId === 'pro' || planId === 'unlimited' ? planId : 'starter';
}

export function hasPlanFeature(planId: string | null | undefined, feature: PlanFeature) {
  return PLAN_ENTITLEMENTS[normalizePlanId(planId)].includes(feature);
}

const PREMIUM_TEMPLATE_CATEGORIES = new Set(['premium', 'minimal_premium', 'booth_360']);

type TemplateAccessPayload = {
  id?: string | null;
  templateId?: string | null;
  category?: string | null;
  isPremium?: boolean | null;
  templateType?: string | null;
  type?: string | null;
  animationUrl?: string | null;
  animationStoragePath?: string | null;
  templateStoragePath?: string | null;
  storagePath?: string | null;
};

function looksAnimatedPath(value?: string | null) {
  return Boolean(value && (
    /^animated-/i.test(value)
    || /(^|\/)(animated|animated-v\d+|templates\/animated)(\/|$)/i.test(value)
    || /\.(webm|gif|mp4|mov)(\?|$)/i.test(value)
  ));
}

export function templateRequiresPremiumFeature(template?: TemplateAccessPayload | null) {
  if (!template) return false;
  return Boolean(
    template.isPremium
    || (template.category && PREMIUM_TEMPLATE_CATEGORIES.has(template.category))
    || template.templateType === 'animated'
    || template.type === 'animated'
    || template.animationUrl
    || looksAnimatedPath(template.id)
    || looksAnimatedPath(template.templateId)
    || looksAnimatedPath(template.animationStoragePath)
    || looksAnimatedPath(template.templateStoragePath)
    || looksAnimatedPath(template.storagePath)
  );
}

export function canUseTemplateFeature(planId: string | null | undefined, template?: TemplateAccessPayload | null, isAdmin = false) {
  if (isAdmin || !templateRequiresPremiumFeature(template)) return true;
  return hasPlanFeature(planId, 'premium_templates');
}

export function featureForEffect(effect?: string | null): PlanFeature {
  if (!effect || BASIC_EFFECTS.includes(effect)) return 'basic_effects';
  if (AI_EFFECTS.includes(effect)) return 'ai_auto_edit';
  return 'popular_effects';
}

export function getPlanEntitlements(planId?: string | null) {
  const normalized = normalizePlanId(planId);
  return {
    planId: normalized,
    features: PLAN_ENTITLEMENTS[normalized],
    effects: [
      ...BASIC_EFFECTS,
      ...(hasPlanFeature(normalized, 'popular_effects') ? POPULAR_EFFECTS : []),
      ...(hasPlanFeature(normalized, 'ai_auto_edit') ? AI_EFFECTS : []),
    ],
  };
}
