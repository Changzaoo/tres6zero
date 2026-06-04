import { PLANS, normalizePlanId } from '@/config/plans';
import type { UserProfile } from '@/types';

export function formatSubscriptionDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(date);
}

export function currentPlanLabel(user?: UserProfile | null) {
  if (!user) return 'Sem plano';
  if (user.role === 'support') return 'Suporte';
  if (!user.planId && user.role !== 'admin') {
    return user.subscriptionStatus === 'active' ? 'Plano ativo' : 'Sem plano';
  }

  const planId = user.role === 'admin' && !user.planId ? 'unlimited' : normalizePlanId(user.planId);
  return PLANS.find((plan) => plan.id === planId)?.name || 'Plano SIX3';
}

export function planExpirationLabel(user?: UserProfile | null) {
  if (!user) return 'Sem assinatura';
  if (user.role === 'support') return 'Suporte';
  if (user.subscriptionStatus !== 'active') return 'Sem assinatura';

  const expirationDate = formatSubscriptionDate(user.currentPeriodEnd);
  return expirationDate ? `Expira em: ${expirationDate}` : 'Sem expiração';
}
