import { create } from 'zustand';
import { clearAuthSession, getCurrentUser } from '@/services/authService';
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
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

  try {
    const user = await getCurrentUser();
    setUser(user);
  } catch {
    reset();
  } finally {
    setLoading(false);
    setInitialized(true);
  }
}

initializeAuth();
