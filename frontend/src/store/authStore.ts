import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Usuario } from '../types';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  setAuth: (token: string, usuario: Usuario) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      setAuth: (token, usuario) => {
        localStorage.setItem('token', token);
        set({ token, usuario });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, usuario: null });
      },
      isAuthenticated: () => !!get().token,
      hasRole: (...roles) => {
        const rol = get().usuario?.rol;
        return !!rol && roles.includes(rol);
      },
    }),
    { name: 'auth-storage' }
  )
);
