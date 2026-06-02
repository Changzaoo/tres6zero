import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="six3-glass flex flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.055] text-white/35">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white/80">{title}</h3>
        {description && <p className="text-sm text-white/40 mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <Button onClick={action.onClick} size="md">{action.label}</Button>}
    </div>
  );
}
