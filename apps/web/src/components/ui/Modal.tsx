import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, size = 'md', panelClassName = '', headerClassName = '', bodyClassName = '' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className={`relative max-h-[92dvh] w-full ${sizes[size]} overflow-hidden rounded-t-[26px] border border-white/[0.08] bg-[#11131b] text-white shadow-2xl shadow-black/60 sm:rounded-2xl ${panelClassName}`}>
            {title && (
              <div className={`flex items-center justify-between gap-3 border-b border-white/[0.08] p-4 sm:p-6 ${headerClassName}`}>
                <h2 className="min-w-0 truncate text-base font-semibold sm:text-lg">{title}</h2>
                <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className={`max-h-[calc(92dvh-4.5rem)] overflow-y-auto p-4 sm:p-6 ${bodyClassName}`}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
