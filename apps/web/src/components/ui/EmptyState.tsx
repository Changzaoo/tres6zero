import { motion } from 'framer-motion';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-white/30">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white/80">{title}</h3>
        {description && <p className="text-sm text-white/40 mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <Button onClick={action.onClick} size="md">{action.label}</Button>}
    </motion.div>
  );
}
