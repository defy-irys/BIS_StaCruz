import { create } from "zustand";

export type ToastLevel = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  level: ToastLevel;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(toast) {
    const id = `t-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-4) }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4800);
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Imperative helper usable outside React components. */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ level: "success", title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ level: "error", title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ level: "info", title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ level: "warning", title, description }),
};
