import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingState';
import { BannedAccountNotice } from '@/components/auth/BannedAccountNotice';
import type { UserProfile } from '@/types';

const AppShell = lazy(() => import('@/components/layout/AppShell').then((module) => ({ default: module.AppShell })));

// Public
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const PricingPage = lazy(() => import('@/pages/public/PricingPage'));
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'));
const VideoPage = lazy(() => import('@/pages/public/VideoPage'));
const BlueprintPage = lazy(() => import('@/pages/public/BlueprintPage'));
const PublicInfoPage = lazy(() => import('@/pages/public/PublicInfoPage'));
const PublicDocsPage = lazy(() => import('@/pages/public/PublicDocsPage'));

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));

// App
const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const EventsPage = lazy(() => import('@/pages/app/EventsPage'));
const EventFormPage = lazy(() => import('@/pages/app/EventFormPage'));
const OperatorPage = lazy(() => import('@/pages/app/OperatorPage'));
const VideosPage = lazy(() => import('@/pages/app/VideosPage'));
const TemplatesPage = lazy(() => import('@/pages/app/TemplatesPage'));
const LeadsPage = lazy(() => import('@/pages/app/LeadsPage'));
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'));
const AdminPage = lazy(() => import('@/pages/app/AdminPage'));
const BillingPage = lazy(() => import('@/pages/app/BillingPage'));
const LockedFeaturePage = lazy(() => import('@/pages/app/LockedFeaturePage'));
const SupportPage = lazy(() => import('@/pages/app/SupportPage'));
const SupportDashboardPage = lazy(() => import('@/pages/app/SupportDashboardPage'));

function defaultAppPath(user?: Pick<UserProfile, 'role'> | null) {
  return user?.role === 'support' ? '/app/support-dashboard' : '/app/dashboard';
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.banned) return <BannedAccountNotice reason={user.banReason} expiresAt={user.banExpiresAt} />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (user) return <Navigate to={defaultAppPath(user)} replace />;
  return <>{children}</>;
}

function PaidRoute({ children }: { children: ReactNode }) {
  const { user, initialized, hasActiveSubscription } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.banned) return <BannedAccountNotice reason={user.banReason} expiresAt={user.banExpiresAt} />;
  if (user.role === 'support') return <Navigate to="/app/support-dashboard" replace />;
  if (!hasActiveSubscription) return <LockedFeaturePage />;
  return <>{children}</>;
}

function NonSupportRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.banned) return <BannedAccountNotice reason={user.banReason} expiresAt={user.banExpiresAt} />;
  if (user.role === 'support') return <Navigate to="/app/support-dashboard" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, initialized, isAdmin } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.banned) return <BannedAccountNotice reason={user.banReason} expiresAt={user.banExpiresAt} />;
  if (!isAdmin) return <Navigate to={user.role === 'support' ? '/app/support-dashboard' : '/app/billing'} replace />;
  return <>{children}</>;
}

function SupportStaffRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.banned) return <BannedAccountNotice reason={user.banReason} expiresAt={user.banExpiresAt} />;
  if (user.role !== 'admin' && user.role !== 'support') return <Navigate to={defaultAppPath(user)} replace />;
  return <>{children}</>;
}

function AppIndexRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'support' ? 'support-dashboard' : 'billing'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/plans" element={<PricingPage />} />
        <Route path="/planos" element={<PricingPage />} />
        <Route path="/blueprint" element={<BlueprintPage />} />
        <Route path="/recursos" element={<PublicInfoPage pageId="recursos" />} />
        <Route path="/como-funciona" element={<PublicInfoPage pageId="como-funciona" />} />
        <Route path="/estilos" element={<PublicInfoPage pageId="estilos" />} />
        <Route path="/mobile" element={<PublicInfoPage pageId="mobile" />} />
        <Route path="/desktop" element={<PublicInfoPage pageId="desktop" />} />
        <Route path="/templates" element={<PublicInfoPage pageId="templates" />} />
        <Route path="/analytics" element={<PublicInfoPage pageId="analytics" />} />
        <Route path="/pagamento" element={<PublicInfoPage pageId="pagamento" />} />
        <Route path="/suporte" element={<PublicInfoPage pageId="suporte" />} />
        <Route path="/faq" element={<PublicDocsPage pageId="faq" />} />
        <Route path="/ajuda" element={<PublicDocsPage pageId="faq" />} />
        <Route path="/termos" element={<PublicDocsPage pageId="termos" />} />
        <Route path="/termos-de-uso" element={<PublicDocsPage pageId="termos" />} />
        <Route path="/privacidade" element={<PublicDocsPage pageId="privacidade" />} />
        <Route path="/politica-de-privacidade" element={<PublicDocsPage pageId="privacidade" />} />
        <Route path="/roadmap" element={<PublicDocsPage pageId="roadmap" />} />
        <Route path="/materiais" element={<PublicDocsPage pageId="materiais" />} />
        <Route path="/g/:eventSlug" element={<GalleryPage />} />
        <Route path="/g/:eventSlug/:videoId" element={<VideoPage />} />
        <Route path="/v/:videoId" element={<VideoPage />} />

        {/* Auth */}
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/entrar" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
        <Route path="/criar-conta" element={<AuthRoute><RegisterPage /></AuthRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* App (private) */}
        <Route path="/app" element={<PrivateRoute><AppShell /></PrivateRoute>}>
          <Route index element={<AppIndexRedirect />} />
          <Route path="dashboard" element={<PaidRoute><DashboardPage /></PaidRoute>} />
          <Route path="events" element={<PaidRoute><EventsPage /></PaidRoute>} />
          <Route path="events/new" element={<PaidRoute><EventFormPage /></PaidRoute>} />
          <Route path="events/:id" element={<PaidRoute><EventsPage /></PaidRoute>} />
          <Route path="events/:id/edit" element={<PaidRoute><EventFormPage /></PaidRoute>} />
          <Route path="operator" element={<Navigate to="../gravar" replace />} />
          <Route path="gravar" element={<PaidRoute><OperatorPage /></PaidRoute>} />
          <Route path="videos" element={<NonSupportRoute><VideosPage /></NonSupportRoute>} />
          <Route path="templates" element={<PaidRoute><TemplatesPage /></PaidRoute>} />
          <Route path="leads" element={<PaidRoute><LeadsPage /></PaidRoute>} />
          <Route path="analytics" element={<Navigate to="../leads" replace />} />
          <Route path="billing" element={<NonSupportRoute><BillingPage /></NonSupportRoute>} />
          <Route path="settings" element={<NonSupportRoute><SettingsPage /></NonSupportRoute>} />
          <Route path="support" element={<NonSupportRoute><SupportPage /></NonSupportRoute>} />
          <Route path="support-dashboard" element={<SupportStaffRoute><SupportDashboardPage /></SupportStaffRoute>} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
