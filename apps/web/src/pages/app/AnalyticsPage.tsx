import { BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const weekData = [
  { name: 'Seg', views: 45, downloads: 12, shares: 28 },
  { name: 'Ter', views: 72, downloads: 22, shares: 41 },
  { name: 'Qua', views: 38, downloads: 8, shares: 19 },
  { name: 'Qui', views: 91, downloads: 35, shares: 57 },
  { name: 'Sex', views: 124, downloads: 48, shares: 73 },
  { name: 'Sáb', views: 168, downloads: 62, shares: 98 },
  { name: 'Dom', views: 143, downloads: 55, shares: 84 },
];

const pieData = [
  { name: 'WhatsApp', value: 55, color: '#25d366' },
  { name: 'Direto', value: 28, color: '#7c3aed' },
  { name: 'Instagram', value: 12, color: '#e1306c' },
  { name: 'Outros', value: 5, color: '#4f46e5' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/40 text-sm">Métricas e desempenho da sua plataforma</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white/70 mb-4">Atividade (últimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Bar dataKey="views" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Visualizações" />
              <Bar dataKey="downloads" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Downloads" />
              <Bar dataKey="shares" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Compartilhamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white/70 mb-4">Canais de compartilhamento</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-white/60">{d.name}</span>
                  <span className="text-white font-medium ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-white/70 mb-3">Dica profissional</h3>
        <p className="text-sm text-white/50">
          Os dados acima são demonstrativos. Para métricas reais, os eventos de visualização, download e compartilhamento são registrados automaticamente quando convidados acessam a galeria pública.
        </p>
      </Card>
    </div>
  );
}
