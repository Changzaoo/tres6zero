import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/services/authService';
import type { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
}));

// Initialize auth listener
onAuthStateChanged(auth, async (firebaseUser) => {
  const { setUser, setLoading, setInitialized } = useAuthStore.getState();
  if (firebaseUser) {
    const profile = await getUserProfile(firebaseUser.uid);
    setUser(profile || {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Usuário',
      email: firebaseUser.email || '',
      role: 'operator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    setUser(null);
  }
  setLoading(false);
  setInitialized(true);
});
