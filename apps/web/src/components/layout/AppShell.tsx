import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MouseAura } from '@/components/landing/MouseAura';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { OfflineConflictWatcher } from '@/components/offline/OfflineConflictWatcher';
import { OfflineReadyToast } from '@/components/offline/OfflineReadyToast';
import { PendingSyncPanel } from '@/components/offline/PendingSyncPanel';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { useAuth } from '@/hooks/useAuth';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';

function RouteTransitionFallback() {
  return (
    <div className="six3-page-enter min-h-[calc(100dvh-8rem)]" role="status" aria-label="Carregando pagina">
      <div className="six3-route-progress" />
      <div className="mt-4 space-y-3 sm:mt-6">
        <div className="six3-shimmer h-9 w-40 rounded-2xl bg-white/[0.07]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="six3-shimmer h-20 rounded-2xl bg-white/[0.055]" />
          ))}
        </div>
        <div className="six3-shimmer h-48 rounded-2xl bg-white/[0.045]" />
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  useNotificationPolling(user);

  return (
    <div className="six3-grid-bg flex h-[100dvh] min-w-0 overflow-hidden bg-surface">
      <MouseAura />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="relative z-10 min-w-0 flex-1 overflow-y-auto p-3 pb-28 sm:p-4 md:p-6 md:pb-28 lg:pb-6">
          <Suspense fallback={<RouteTransitionFallback />}>
            <div key={location.pathname} className="six3-page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <MobileBottomNav />
        <PendingSyncPanel />
        <OfflineConflictWatcher />
        <OfflineReadyToast />
      </div>
    </div>
  );
}
