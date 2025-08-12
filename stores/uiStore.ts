import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState, Toast } from '@/types';

interface UIStore extends UIState {
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      toasts: [],

      toggleTheme: () => {
        set(state => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }));
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
      },

      toggleSidebar: () => {
        set(state => ({
          sidebarOpen: !state.sidebarOpen
        }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      showToast: (toast: Omit<Toast, 'id'>) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = {
          ...toast,
          id,
          duration: toast.duration || 5000,
        };

        set(state => ({
          toasts: [...state.toasts, newToast]
        }));

        // Auto-remove toast after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }
      },

      removeToast: (id: string) => {
        set(state => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }));
      },

      clearAllToasts: () => {
        set({ toasts: [] });
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
);
