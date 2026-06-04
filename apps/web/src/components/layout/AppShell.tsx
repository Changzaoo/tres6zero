import { Outlet } from 'react-router-dom';
import { MouseAura } from '@/components/landing/MouseAura';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineConflictWatcher } from '@/components/offline/OfflineConflictWatcher';
import { OfflineReadyToast } from '@/components/offline/OfflineReadyToast';
import { PendingSyncPanel } from '@/components/offline/PendingSyncPanel';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { useAuth } from '@/hooks/useAuth';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const { user } = useAuth();
  useNotificationPolling(user);

  return (
    <div className="six3-grid-bg flex h-[100dvh] min-w-0 overflow-hidden bg-surface">
      <MouseAura />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="relative z-10 min-w-0 flex-1 overflow-y-auto p-3 pb-28 sm:p-4 md:p-6 md:pb-28 lg:pb-6">
          <Outlet />
        </main>
        <MobileBottomNav />
        <PendingSyncPanel />
        <OfflineConflictWatcher />
        <OfflineReadyToast />
      </div>
    </div>
  );
}
