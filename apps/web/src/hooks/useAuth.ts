import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, loading, initialized } = useAuthStore();
  const hasActiveSubscription = user?.subscriptionStatus === 'active';

  return {
    user,
    loading,
    initialized,
    hasActiveSubscription,
    isAdmin: user?.role === 'admin',
    isSupport: user?.role === 'support',
    isOperator: Boolean(user),
  };
}
