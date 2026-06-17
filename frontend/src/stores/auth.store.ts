import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await api.post<{ token: string; user: User }>('/auth/login', {
            email,
            password,
          });
          localStorage.setItem('token', result.token);
          set({ token: result.token, user: result.user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      fetchProfile: async () => {
        try {
          const user = await api.get<User>('/me');
          set({ user });
        } catch {
          get().logout();
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'fito6-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export const isAdmin = (user: User | null) => user?.role === 'ADMIN';
