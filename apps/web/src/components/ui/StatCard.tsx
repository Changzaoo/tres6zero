import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-gradient-glass backdrop-blur-sm p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50 font-medium">{title}</span>
        <div className={`p-2 rounded-xl bg-white/5 ${color}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
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
    </motion.div>
  );
}
