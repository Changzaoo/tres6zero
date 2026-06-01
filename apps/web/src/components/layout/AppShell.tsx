import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/events': 'Eventos',
  '/app/operator': 'Modo Operador',
  '/app/videos': 'Vídeos',
  '/app/templates': 'Templates',
  '/app/leads': 'Leads',
  '/app/analytics': 'Analytics',
  '/app/billing': 'Planos',
  '/app/settings': 'Configurações',
  '/app/admin': 'Admin',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'SIX3°';

  return (
    <div className="six3-grid-bg flex h-screen bg-surface overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
