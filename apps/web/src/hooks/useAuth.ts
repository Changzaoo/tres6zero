import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, loading, initialized } = useAuthStore();
  return { user, loading, initialized, isAdmin: user?.role === 'admin', isOperator: user?.role === 'operator' || user?.role === 'admin' };
}
