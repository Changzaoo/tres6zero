import { create } from 'zustand';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().add('success', m),
  error: (m: string) => useToastStore.getState().add('error', m),
  warning: (m: string) => useToastStore.getState().add('warning', m),
  info: (m: string) => useToastStore.getState().add('info', m),
};

const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info };
const colors = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  info: 'border-brand-500/30 bg-brand-500/10 text-brand-400',
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-full">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-[18px] border p-4 shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-200 ease-out ${colors[t.type]}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm text-white/90 flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
