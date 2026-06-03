import { hasFeature } from '@/config/plans';
import { isTemplateAnimated } from '@/services/templateStorage';
import type { AppTemplate } from '@/types';

const PREMIUM_TEMPLATE_CATEGORIES = new Set(['premium', 'minimal_premium', 'booth_360']);

export function templateRequiresPremiumTemplates(template?: AppTemplate | null) {
  return Boolean(
    template
    && (
      isTemplateAnimated(template)
      || template.isPremium
      || PREMIUM_TEMPLATE_CATEGORIES.has(template.category)
    )
  );
}

export function canUseTemplateForPlan(template: AppTemplate | null | undefined, planId?: string | null, isAdmin = false) {
  if (!template || isAdmin) return true;
  return !templateRequiresPremiumTemplates(template) || hasFeature(planId, 'premium_templates', isAdmin);
}
