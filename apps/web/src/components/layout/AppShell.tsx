import { Outlet, useLocation } from 'react-router-dom';
import { MouseAura } from '@/components/landing/MouseAura';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';

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
  '/app/support': 'Suporte',
  '/app/admin': 'Admin',
};

export function AppShell() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'SIX3°';

  return (
    <div className="six3-grid-bg flex h-screen overflow-hidden bg-surface">
      <MouseAura />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-28 lg:pb-6">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
