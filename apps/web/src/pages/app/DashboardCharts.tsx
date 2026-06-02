import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '@/components/ui/Card';
import type { DashboardChartPoint } from '@/types';

const tooltipStyle = {
  background: '#1a1a24',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

const axisTick = { fill: 'rgba(255,255,255,0.3)', fontSize: 12 };

type DashboardChartsProps = {
  data: DashboardChartPoint[];
};

function EmptyRealData({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-xs text-white/28">
      {label}
    </div>
  );
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  const hasDailyData = data.some((point) => point.videos > 0 || point.leads > 0);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-semibold text-white/70 mb-4">Videos e Leads (ultimos 7 dias)</h3>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="videos" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Videos reais" />
              <Bar dataKey="leads" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Leads reais" />
            </BarChart>
          </ResponsiveContainer>
          {!hasDailyData && <EmptyRealData label="Sem videos ou leads reais nos ultimos 7 dias." />}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white/70 mb-4">Crescimento semanal</h3>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="cumulativeVideos" stroke="#7c3aed" strokeWidth={2} dot={false} name="Videos acumulados" />
              <Line type="monotone" dataKey="cumulativeLeads" stroke="#4f46e5" strokeWidth={2} dot={false} name="Leads acumulados" />
            </LineChart>
          </ResponsiveContainer>
          {!hasDailyData && <EmptyRealData label="Crescimento zerado para o periodo atual." />}
        </div>
      </Card>
    </div>
  );
}
