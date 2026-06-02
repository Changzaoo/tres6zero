import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '@/components/ui/Card';

const chartData = [
  { name: 'Seg', videos: 4, leads: 8 },
  { name: 'Ter', videos: 7, leads: 14 },
  { name: 'Qua', videos: 3, leads: 6 },
  { name: 'Qui', videos: 9, leads: 18 },
  { name: 'Sex', videos: 12, leads: 24 },
  { name: 'Sáb', videos: 18, leads: 36 },
  { name: 'Dom', videos: 15, leads: 30 },
];

const tooltipStyle = {
  background: '#1a1a24',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

const axisTick = { fill: 'rgba(255,255,255,0.3)', fontSize: 12 };

export default function DashboardCharts() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-semibold text-white/70 mb-4">Vídeos e Leads (últimos 7 dias)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="videos" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Vídeos" />
            <Bar dataKey="leads" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white/70 mb-4">Crescimento semanal</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="videos" stroke="#7c3aed" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="leads" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
