import { create } from 'zustand';
import { clearAuthSession, getAuthToken, getCachedUser, getCurrentUser } from '@/services/authService';
import type { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: (v: boolean) => void;
  reset: () => void;
}

const cachedUser = getCachedUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: cachedUser,
  loading: Boolean(getAuthToken()) && !cachedUser,
  initialized: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => {
    clearAuthSession();
    set({ user: null, loading: false, initialized: true });
  },
}));

async function initializeAuth() {
  const { setUser, setLoading, setInitialized, reset } = useAuthStore.getState();
  const hasToken = Boolean(getAuthToken());

  setInitialized(true);

  if (!hasToken) {
    setLoading(false);
    setUser(null);
    return;
  }

  try {
    setLoading(!useAuthStore.getState().user);
    const user = await getCurrentUser();
    setUser(user);
  } catch (error) {
    if (getCachedUser() && typeof navigator !== 'undefined' && !navigator.onLine) {
      setUser(getCachedUser());
    } else {
      reset();
      console.warn('[auth] Session refresh failed:', error);
    }
  } finally {
    setLoading(false);
    setInitialized(true);
  }
}

initializeAuth();
