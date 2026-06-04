import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, trend, color = 'text-brand-400', loading }: StatCardProps) {
  return (
    <div className="six3-glass six3-card-hover flex min-w-0 flex-col gap-3 p-4 sm:gap-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-white/50 sm:text-sm">{title}</span>
        <div className={`shrink-0 rounded-xl bg-white/5 p-2 ${color}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="six3-shimmer h-8 w-24 rounded-lg bg-white/10" />
      ) : (
        <div className="flex min-w-0 items-end justify-between gap-2">
          <span className="min-w-0 truncate text-2xl font-bold text-white sm:text-3xl">{value}</span>
          {trend !== undefined && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
