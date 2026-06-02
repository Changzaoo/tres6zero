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
    <div className="six3-glass six3-card-hover flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50 font-medium">{title}</span>
        <div className={`p-2 rounded-xl bg-white/5 ${color}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="six3-shimmer h-8 w-24 rounded-lg bg-white/10" />
      ) : (
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-white">{value}</span>
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
