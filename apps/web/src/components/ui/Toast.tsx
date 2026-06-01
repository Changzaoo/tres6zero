import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <motion.div key={t.id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
              className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm ${colors[t.type]} shadow-lg`}>
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm text-white/90 flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
